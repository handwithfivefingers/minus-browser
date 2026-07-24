import { app, session } from 'electron'

let hasCustomUserAgent = false

function getFirefoxUA(): string {
  const rootUAs: Record<string, string> = {
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:FXVERSION.0) Gecko/20100101 Firefox/FXVERSION.0',
    windows: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:FXVERSION.0) Gecko/20100101 Firefox/FXVERSION.0',
    linux: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:FXVERSION.0) Gecko/20100101 Firefox/FXVERSION.0',
  }

  let rootUA: string
  if (process.platform === 'win32') {
    rootUA = rootUAs.windows
  } else if (process.platform === 'darwin') {
    rootUA = rootUAs.mac
  } else {
    rootUA = rootUAs.linux
  }

  const fxVersion = 91 + Math.floor((Date.now() - 1628553600000) / (4.1 * 7 * 24 * 60 * 60 * 1000))

  return rootUA.replace(/FXVERSION/g, String(fxVersion))
}

function enableGoogleUASwitcher(ses: Electron.Session): void {
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!hasCustomUserAgent && details.url.includes('accounts.google.com')) {
      const urlObj = new URL(details.url)
      if (urlObj.hostname === 'accounts.google.com') {
        details.requestHeaders['User-Agent'] = getFirefoxUA()
      }
    }

    const chromiumVersion = process.versions.chrome.split('.')[0]
    details.requestHeaders['SEC-CH-UA'] =
      `"Chromium";v="${chromiumVersion}", "Google Chrome";v="${chromiumVersion}", "Not=A?Brand";v="99"`
    details.requestHeaders['SEC-CH-UA-MOBILE'] = '?0'

    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })
}

export function setupUserAgent(ses: Electron.Session): void {
  enableGoogleUASwitcher(ses)
}

export function initializeUserAgent(): void {
  const defaultUserAgent = app.userAgentFallback
  let newUserAgent: string

  if (process.env.MINUS_CUSTOM_USER_AGENT) {
    newUserAgent = process.env.MINUS_CUSTOM_USER_AGENT
    hasCustomUserAgent = true
  } else {
    newUserAgent = defaultUserAgent
      .replace(/MinusBrowser\/\S+\s/, '')
      .replace(/Electron\/\S+\s/, '')
      .replace(
        process.versions.chrome,
        process.versions.chrome
          .split('.')
          .map((v, idx) => (idx === 0 ? v : '0'))
          .join('.')
      )
  }

  app.userAgentFallback = newUserAgent

  app.once('ready', () => {
    enableGoogleUASwitcher(session.defaultSession)
  })

  app.on('session-created', enableGoogleUASwitcher)
}
