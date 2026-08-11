import { ipcRenderer, webFrame } from 'electron'

/**
 * Vault page preload (MinBrowser-style).
 *
 * Runs at document-start inside every frame of every page (registered via
 * session.setPreloads + nodeIntegrationInSubFrames). Handles:
 *  - login field detection
 *  - autofill (single match auto-fill, multiple match dropdown, key icon)
 *  - credential capture on form submit
 *  - password generation
 *
 * All page <-> main communication is frame-scoped. Main replies with
 * sendToFrame(frameId, ...) so the correct frame (e.g. a login iframe) is
 * targeted.
 */

declare const trustedTypes: {
  createPolicy: (
    name: string,
    rules: { createHTML: (string: string) => string }
  ) => { createHTML: (string: string) => string }
}

const isHttpPage = window.location.protocol === 'http:' || window.location.protocol === 'https:'
if (!isHttpPage) {
  // never run on internal pages (min://, chrome-error, about:blank, ...)
  throw new Error('password autofill is not available on internal pages')
}

const getKeyIcon = () => {
  const keyIcon =
    '<svg width="22px" height="22px" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 32 32"><path d="M21 2a9 9 0 0 0-9 9a8.87 8.87 0 0 0 .39 2.61L2 24v6h6l10.39-10.39A9 9 0 0 0 30 11.74a8.77 8.77 0 0 0-1.65-6A9 9 0 0 0 21 2zm0 16a7 7 0 0 1-2-.3l-1.15-.35l-.85.85l-3.18 3.18L12.41 20L11 21.41l1.38 1.38l-1.59 1.59L9.41 23L8 24.41l1.38 1.38L7.17 28H4v-3.17L13.8 15l.85-.85l-.29-.95a7.14 7.14 0 0 1 3.4-8.44a7 7 0 0 1 10.24 6a6.69 6.69 0 0 1-1.09 4A7 7 0 0 1 21 18z" fill="currentColor"/><circle cx="22" cy="10" r="2" fill="currentColor"/></svg>'

  const keyIconPolicy = trustedTypes.createPolicy('minusAutofillTrustedKeyIcon', {
    createHTML: (string: string) => string,
  })

  return keyIconPolicy.createHTML(keyIcon)
}

const keyIcon = getKeyIcon()

let currentUnlockButton: HTMLElement | null = null
let currentAutocompleteList: HTMLElement | null = null

interface IAutofillCredentials {
  username: string
  password: string
}

function createUnlockButton(input: HTMLInputElement): HTMLElement {
  const inputRect = input.getBoundingClientRect()

  const unlockDiv = document.createElement('div')
  unlockDiv.style.width = '20px'
  unlockDiv.style.height = '20px'
  unlockDiv.style.zIndex = '999999999999999'
  unlockDiv.style.position = 'absolute'
  unlockDiv.style.left = window.scrollX + (inputRect.left + inputRect.width - 20 - 10) + 'px'
  unlockDiv.style.top = window.scrollY + (inputRect.top + (inputRect.height - 20) / 2.0) + 'px'

  const button = document.createElement('div')
  button.style.width = '20px'
  button.style.height = '20px'
  button.style.opacity = '0.7'
  button.style.color = window.getComputedStyle(input).color
  button.style.transition = '0.1s color'
  button.style.cursor = 'pointer'
  button.innerHTML = keyIcon

  button.addEventListener('mouseenter', () => {
    button.style.opacity = '1.0'
  })
  button.addEventListener('mouseleave', () => {
    button.style.opacity = '0.7'
  })

  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
    requestAutofill()
  })

  unlockDiv.appendChild(button)
  return unlockDiv
}

function checkAttributes(element: Element, attributes: string[], matches: string[]): boolean {
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute)
    if (value == null) continue
    if (matches.some((match) => value.toLowerCase().includes(match))) {
      return true
    }
  }
  return false
}

function getBestInput(names: string[], exclusionNames: string[], types: string[]): HTMLInputElement | null {
  const allFields: HTMLInputElement[] = [
    ...(Array.from(document.querySelectorAll('form input')) as HTMLInputElement[]),
    ...(Array.from(document.querySelectorAll('input')) as HTMLInputElement[]),
  ]

  for (const field of allFields) {
    if (!types.includes(field.type)) {
      continue
    }
    if (
      names.length === 0 ||
      checkAttributes(field, ['name', 'formcontrolname', 'id', 'placholder', 'aria-label'], names)
    ) {
      if (
        !checkAttributes(field, ['name', 'formcontrolname', 'id', 'placeholder', 'aria-label'], exclusionNames) &&
        field.type !== 'hidden'
      ) {
        return field
      }
    }
  }
  return null
}

function getBestUsernameField(): HTMLInputElement | null {
  return getBestInput(
    ['user', 'name', 'mail', 'login', 'auth', 'identifier', 'account', 'acct'],
    ['confirm', 'filename'],
    ['text', 'email']
  )
}

function getBestPasswordField(): HTMLInputElement | null {
  return getBestInput([], [], ['password'])
}

function getPasswordConfirmationField(primaryField: HTMLInputElement): HTMLInputElement | null {
  const autocompleteMarkedFields = Array.from(
    document.querySelectorAll<HTMLInputElement>('[autocomplete="new-password"]')
  )
  if (autocompleteMarkedFields.length > 0) {
    return autocompleteMarkedFields.find((field) => field !== primaryField) || null
  }
  const bestConfirmInput = getBestInput(['confirm', 'retype'], [], ['password'])
  if (bestConfirmInput && bestConfirmInput !== primaryField) {
    return bestConfirmInput
  }
  return null
}

function removeAutocompleteList() {
  if (currentAutocompleteList && currentAutocompleteList.parentNode) {
    currentAutocompleteList.parentNode.removeChild(currentAutocompleteList)
  }
}

function fillCredentials(credentials: IAutofillCredentials) {
  const { username, password } = credentials
  const inputEvents = ['keydown', 'keypress', 'keyup', 'input', 'change']

  const usernameField = getBestUsernameField()
  if (usernameField) {
    usernameField.value = username
    for (const event of inputEvents) {
      usernameField.dispatchEvent(new Event(event, { bubbles: true }))
    }
  }

  const passwordField = getBestPasswordField()
  if (passwordField) {
    passwordField.value = password
    for (const event of inputEvents) {
      passwordField.dispatchEvent(new Event(event, { bubbles: true }))
    }
  }
}

function showCredentialDropdown(element: HTMLInputElement, credentials: IAutofillCredentials[]) {
  removeAutocompleteList()
  const inputRect = element.getBoundingClientRect()

  const container = document.createElement('div')
  container.style.cssText =
    'position: absolute; border: 1px solid #d4d4d4; z-index: 999999; border-bottom: none; background: #FFFFFF; transform: scale(0); opacity: 0; transform-origin: top left; transition: 0.15s; color: #000000;'
  container.style.top = inputRect.y + inputRect.height + 'px'
  container.style.left = inputRect.x + 'px'
  container.id = 'password-autocomplete-list'
  requestAnimationFrame(() => {
    container.style.opacity = '1'
    container.style.transform = 'scale(1)'
  })

  for (const cred of credentials) {
    const suggestionItem = document.createElement('div')
    suggestionItem.textContent = cred.username
    suggestionItem.style.cssText =
      'padding: 10px; cursor: pointer; background-color: #fff; border-bottom: 1px solid #d4d4d4;'

    suggestionItem.addEventListener('mouseenter', () => {
      suggestionItem.style.backgroundColor = '#e4e4e4'
    })
    suggestionItem.addEventListener('mouseleave', () => {
      suggestionItem.style.backgroundColor = '#fff'
    })

    suggestionItem.addEventListener('click', () => {
      fillCredentials(cred)
      removeAutocompleteList()
      element.focus()
    })

    container.appendChild(suggestionItem)
  }

  document.body.appendChild(container)
  currentAutocompleteList = container
}

function requestAutofill() {
  if (getBestUsernameField() && getBestPasswordField()) {
    ipcRenderer.send('password-autofill')
  }
}

function maybeAddUnlockButton(target: EventTarget | null) {
  if (target instanceof Node && getBestUsernameField() && getBestPasswordField()) {
    const usernameField = getBestUsernameField()
    const passwordField = getBestPasswordField()
    if ((usernameField && usernameField.isSameNode(target)) || (passwordField && passwordField.isSameNode(target))) {
      if (currentUnlockButton && currentUnlockButton.parentElement) {
        currentUnlockButton.parentElement.removeChild(currentUnlockButton)
      }
      const unlockButton = createUnlockButton(target as HTMLInputElement)
      document.body.appendChild(unlockButton)
      currentUnlockButton = unlockButton
    }
  }
}

function checkInitialFocus() {
  maybeAddUnlockButton(document.activeElement)
}

function handleFocus(event: FocusEvent) {
  maybeAddUnlockButton(event.target)
}

function handleBlur() {
  if (currentUnlockButton !== null && currentUnlockButton.parentElement != null) {
    currentUnlockButton.parentElement.removeChild(currentUnlockButton)
    currentUnlockButton = null
  }
}

document.addEventListener('click', (e) => {
  const target = e.target as Node
  if (!currentAutocompleteList) return
  const clickedUnlockButton = currentUnlockButton && currentUnlockButton.contains(target)
  const clickedInsideList = currentAutocompleteList.contains(target)
  if (!clickedInsideList && !clickedUnlockButton) {
    removeAutocompleteList()
  }
})

ipcRenderer.on('password-autofill-match', (_event, data: { hostname: string; credentials: IAutofillCredentials[] }) => {
  if (data.hostname !== window.location.hostname) {
    throw new Error('password origin must match current page origin')
  }

  if (data.credentials.length === 0) {
    if (currentUnlockButton && currentUnlockButton.children.length > 0) {
      ;(currentUnlockButton.children[0] as HTMLElement).style.color = 'rgb(180, 0, 0)'
    }
  } else if (data.credentials.length === 1) {
    fillCredentials(data.credentials[0])
    const firstPasswordField = getBestPasswordField()
    if (firstPasswordField) {
      firstPasswordField.focus()
    }
  } else {
    const firstField = getBestUsernameField()
    if (firstField) {
      showCredentialDropdown(firstField, data.credentials)
    }
  }
})

ipcRenderer.on('password-autofill-shortcut', () => {
  requestAutofill()
})

ipcRenderer.on('password-autofill-enabled', () => {
  checkInitialFocus()

  window.addEventListener('blur', handleBlur, true)
  window.addEventListener('focus', handleFocus, true)
})

window.addEventListener('load', () => {
  ipcRenderer.send('password-autofill-check')
})

function handleFormSubmit() {
  const usernameValue = getBestUsernameField()?.value
  const passwordValue = getBestPasswordField()?.value

  if (usernameValue && usernameValue.length > 0 && passwordValue && passwordValue.length > 0) {
    ipcRenderer.send('password-form-filled', [window.location.hostname, usernameValue, passwordValue])
  }
}

window.addEventListener('submit', handleFormSubmit)

window.addEventListener(
  'click',
  (e) => {
    const path = (e.composedPath && e.composedPath()) || []
    path.forEach((el) => {
      if (
        el instanceof HTMLElement &&
        el.tagName === 'BUTTON' &&
        el.getAttribute('type') === 'submit' &&
        !(el as HTMLButtonElement).disabled
      ) {
        handleFormSubmit()
      }
    })
  },
  true
)

webFrame.executeJavaScript(`
var origSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function () {
  window.postMessage({message: 'formSubmit'})
  origSubmit.apply(this, arguments)
}
`)

window.addEventListener('message', (e) => {
  if (e.data && e.data.message && e.data.message === 'formSubmit') {
    handleFormSubmit()
  }
})

const passwordGenerationCharset = 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ0123456789-_!'

function fillWithInputEvent(input: HTMLInputElement, value: string) {
  input.value = value
  const simulatedEvent = new InputEvent('input', {
    inputType: 'insertReplacementText',
    data: value,
  })
  input.dispatchEvent(simulatedEvent)
}

let priorGeneratedPassword = ''

ipcRenderer.on('generate-password', (_event, location: { x: number; y: number }) => {
  const activeInput =
    document.activeElement && document.activeElement.matches && document.activeElement.matches('input[type=password]')
      ? (document.activeElement as HTMLInputElement)
      : null
  const input: HTMLInputElement | null =
    activeInput ||
    (Array.from(document.elementsFromPoint(location.x, location.y)).filter(
      (el) => el.matches && el.matches('input[type=password]')
    )[0] as HTMLInputElement) ||
    null

  if (input) {
    let generatedPassword = ''

    if (priorGeneratedPassword) {
      generatedPassword = priorGeneratedPassword
    } else {
      const values = new Uint8Array(16)
      crypto.getRandomValues(values)

      values.forEach((value) => {
        generatedPassword += passwordGenerationCharset[Math.floor((value / 256) * passwordGenerationCharset.length)]
      })

      priorGeneratedPassword = generatedPassword
      setTimeout(
        () => {
          priorGeneratedPassword = ''
        },
        5 * 60 * 1000
      )
    }

    fillWithInputEvent(input, generatedPassword)

    const confirmationInput = getPasswordConfirmationField(input)
    if (confirmationInput) {
      fillWithInputEvent(confirmationInput, generatedPassword)
    }

    setTimeout(() => {
      if (input.value === generatedPassword) {
        const usernameValue = getBestUsernameField()?.value
        ipcRenderer.send('password-form-filled', [window.location.hostname, usernameValue, generatedPassword])
      }
    }, 0)
  }
})
