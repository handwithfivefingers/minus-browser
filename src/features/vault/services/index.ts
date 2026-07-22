import { BrowserWindow, session, WebContentsView } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
// import { Tab } from "~/features/system/models/tab";
const SENTINEL = '__VAULT_RESOLVE__:'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSafeDirname(): string {
  if (typeof __dirname !== 'undefined') return __dirname
  // @ts-ignore
  if (typeof import.meta?.dirname !== 'undefined') return import.meta.dirname
  // @ts-ignore
  if (typeof import.meta?.url !== 'undefined') {
    // @ts-ignore
    return path.dirname(new URL(import.meta.url).pathname)
  }
  throw new Error('Cannot resolve __dirname in current module context')
}

function resolveVaultUrl(): string {
  if (
    // @ts-ignore
    typeof VAULT_INJECTION_VITE_DEV_SERVER_URL !== 'undefined' &&
    // @ts-ignore
    VAULT_INJECTION_VITE_DEV_SERVER_URL
  ) {
    // @ts-ignore
    return `${VAULT_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, '') + '/'
  }
  const basePath = path.join(
    getSafeDirname(),
    // @ts-ignore
    `../renderer/${VAULT_INJECTION_VITE_NAME}/index.html`
  )
  return pathToFileURL(basePath).toString()
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class VaultServices {
  async selectCredential(
    webContents: Electron.WebContents,
    candidates: { id: string; username: string; site: string }[]
  ) {
    const script = `(${openVaultCredentialPickerDialog.toString()})(${JSON.stringify(candidates)});`
    return webContents.executeJavaScript(script, true)
  }

  async confirmSave(webContents: Electron.WebContents, data: { username: string; site: string; isUpdate?: boolean }) {
    const script = `(${openVaultSaveConfirmDialog.toString()})(${JSON.stringify(data)});`
    return webContents.executeJavaScript(script, true)
  }

  // async openManager(win: BrowserWindow, tab: Tab, vaultItems: any[]): Promise<any[] | null> {
  //   try {
  //     return await this._openManagerWithView(win, tab, vaultItems);
  //   } catch (err) {
  //     console.warn("[VaultDialogController] openManager failed, falling back to legacy dialog:", err);
  //     const fallback = `(${openVaultManagerDialog.toString()})(${JSON.stringify(vaultItems || [])});`;
  //     return tab.webContents.executeJavaScript(fallback, true);
  //   }
  // }

  async openManager(view: WebContentsView, vaultItems: any[]): Promise<any[] | null> {
    const win = BrowserWindow.getFocusedWindow()
    const requestId = `vault-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const vaultUrl = resolveVaultUrl()
    const tabBounds = view.getBounds()
    const vaultView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        session: session.fromPartition('persist:minus-vault', { cache: true }),
      },
    })
    vaultView.setBounds(tabBounds)
    vaultView.setBackgroundColor('#00000000')
    win?.contentView?.addChildView(vaultView)

    return new Promise<any[] | null>((resolve, reject) => {
      let settled = false
      let isReady = false

      const onConsoleMessage = (_event: any, _level: any, message: string) => {
        if (!message.startsWith(SENTINEL)) return
        try {
          const json = message.slice(SENTINEL.length)
          const data = JSON.parse(json)
          if (data?.requestId !== requestId) return
          settle(Array.isArray(data.payload) ? data.payload : null)
        } catch {
          // Malformed — ignore, do NOT reject here.
        }
      }

      const onRenderProcessGone = () => {
        if (!isReady) {
          isReady = true
          teardown(0)
          reject(new Error('vault-view-render-process-gone'))
        }
      }

      const teardown = (delayMs: number) => {
        // Detach named listeners only — never removeAllListeners().
        vaultView.webContents.off('console-message', onConsoleMessage)
        vaultView.webContents.off('render-process-gone', onRenderProcessGone)
        clearTimeout(readyTimer)

        // Wait for the renderer's CSS fade-out to finish, then remove the view.
        // No executeJavaScript here — the view may already be closing.
        setTimeout(() => {
          try {
            win?.contentView.removeChildView(vaultView)
          } catch (_) {
            // View may already be removed if the window closed — safe to ignore.
          }
        }, delayMs)
      }

      const settle = (value: any[] | null) => {
        if (!isReady) return
        // Signal the renderer to fade out (it handles its own CSS transition).
        // Fire-and-forget — we do NOT await or chain off this promise.
        if (!vaultView.webContents.isDestroyed()) {
          vaultView.webContents.executeJavaScript(`window.__vaultClose && window.__vaultClose();`).catch(() => {
            // ignore
          })
        }
        // Tear down after the renderer's 120ms fade-out transition completes.
        teardown(150)
        resolve(value)
      }

      /**
       * Check and fallback Legacy Dialog on Time
       */
      const readyTimer = setTimeout(() => {
        if (!isReady) {
          isReady = true
          teardown(0)
          reject(new Error('vault-view-ready-timeout'))
        }
      }, 8000)

      vaultView.webContents.on('console-message', onConsoleMessage)
      vaultView.webContents.on('render-process-gone', onRenderProcessGone)
      vaultView.webContents.once('did-finish-load', () => {
        if (isReady) return // timeout already fired — do nothing
        isReady = true

        const openPayload = JSON.stringify({
          requestId,
          items: vaultItems || [],
        })

        // This is a fire-and-forget executeJavaScript. We intentionally do
        // NOT attach a .catch() that calls reject() — delivery failure is
        // already covered by the readyTimer timeout path.
        vaultView.webContents
          .executeJavaScript(
            `(() => {
              const deliver = () => {
                window.dispatchEvent(
                  new CustomEvent("__vaultOpen", { detail: ${openPayload} })
                );
              };

              if (window.__vaultReady) {
                deliver();
                return;
              }

              // React useEffect is synchronous with the microtask queue.
              // One rAF is enough to guarantee the effect has run.
              requestAnimationFrame(() => {
                if (window.__vaultReady) {
                  deliver();
                  return;
                }
                // Absolute fallback: retry once after 200ms.
                setTimeout(() => {
                  if (window.__vaultReady) deliver();
                  // If still not ready, the 8s readyTimer will handle it.
                }, 200);
              });
            })();`
          )
          .catch(() => {
            // Swallow — do NOT reject here. If delivery failed (e.g. view
            // was destroyed before did-finish-load resolved), the readyTimer
            // will fire and reject cleanly.
          })
      })

      vaultView.webContents.loadURL(vaultUrl).catch((err) => {
        if (!settled) {
          settled = true
          teardown(0)
          reject(err)
        }
      })
    })
  }
}

export const openVaultCredentialPickerDialog = (candidates: { id: string; username: string; site: string }[]) => {
  const trustPolicy = (window as any)?.trustedTypes?.createPolicy('forceInner', {
    createHTML: (to_escape: string) => to_escape,
  })
  return new Promise((resolve) => {
    const old = document.getElementById('__minus_vault_picker')
    if (old) old.remove()

    const root = document.createElement('div')
    root.id = '__minus_vault_picker'
    root.style.position = 'fixed'
    root.style.inset = '0'
    root.style.zIndex = '2147483647'
    root.style.background = 'rgba(15,23,42,.55)'
    root.style.display = 'flex'
    root.style.alignItems = 'center'
    root.style.justifyContent = 'center'

    const panel = document.createElement('div')
    panel.style.width = '440px'
    panel.style.maxWidth = '92vw'
    panel.style.maxHeight = '72vh'
    panel.style.overflow = 'auto'
    panel.style.background = '#fff'
    panel.style.borderRadius = '14px'
    panel.style.padding = '12px'
    panel.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    panel.style.fontSize = '12px'
    panel.style.color = '#0f172a'
    panel.style.border = '1px solid #e2e8f0'
    panel.style.boxShadow = '0 30px 80px rgba(2,6,23,.30)'

    const close = (value: any) => {
      root.remove()
      document.removeEventListener('keydown', onKeyDown)
      resolve(value)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(null)
    }

    document.addEventListener('keydown', onKeyDown)
    root.addEventListener('click', () => close(null))
    panel.addEventListener('click', (event) => event.stopPropagation())

    const header = document.createElement('div')
    header.style.display = 'flex'
    header.style.alignItems = 'center'
    header.style.justifyContent = 'space-between'
    header.style.marginBottom = '10px'

    const title = document.createElement('div')
    title.textContent = 'Choose Credential'
    title.style.fontWeight = '600'

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.width = '20px'
    closeBtn.style.height = '20px'
    closeBtn.style.border = '1px solid #cbd5e1'
    closeBtn.style.background = '#f8fafc'
    closeBtn.style.borderRadius = '4px'
    closeBtn.style.fontSize = '16px'
    closeBtn.style.cursor = 'pointer'
    closeBtn.style.color = '#334155'
    closeBtn.onclick = () => close(null)

    header.appendChild(title)
    header.appendChild(closeBtn)
    panel.appendChild(header)

    candidates.forEach((item) => {
      const btn = document.createElement('button')
      btn.style.width = '100%'
      btn.style.textAlign = 'left'
      btn.style.padding = '8px'
      btn.style.marginBottom = '6px'
      btn.style.border = '1px solid #e2e8f0'
      btn.style.borderRadius = '8px'
      btn.style.background = '#f8fafc'
      btn.style.cursor = 'pointer'
      btn.innerHTML = trustPolicy.createHTML(
        `<div style="font-weight:500;">Domain: ${item.site || 'unknown'}</div>` +
          `<div style="font-weight:300;color:rgba(0,0,0,.8);margin-top:2px;">${item.username || 'unknown'}</div>`
      )
      btn.onclick = () => close(item.id)
      panel.appendChild(btn)
    })

    const actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.justifyContent = 'flex-end'
    actions.style.marginTop = '8px'

    const cancel = document.createElement('button')
    cancel.textContent = 'Cancel'
    cancel.style.height = '30px'
    cancel.style.padding = '0 10px'
    cancel.style.border = '1px solid #cbd5e1'
    cancel.style.borderRadius = '8px'
    cancel.style.background = '#e2e8f0'
    cancel.style.cursor = 'pointer'
    cancel.onclick = () => close(null)

    actions.appendChild(cancel)
    panel.appendChild(actions)
    root.appendChild(panel)
    document.documentElement.appendChild(root)
  })
}

export const openVaultSaveConfirmDialog = (data: { username: string; site: string; isUpdate?: boolean }) => {
  const trustPolicy = (window as any)?.trustedTypes?.createPolicy('forceInner', {
    createHTML: (to_escape: string) => to_escape,
  })
  return new Promise((resolve) => {
    const old = document.getElementById('__minus_vault_save_confirm')
    if (old) old.remove()

    const isUpdate = !!data?.isUpdate
    const username = data?.username || 'this account'
    const site = data?.site || 'this site'

    const root = document.createElement('div')
    root.id = '__minus_vault_save_confirm'
    root.style.position = 'fixed'
    root.style.inset = '0'
    root.style.zIndex = '2147483647'
    root.style.background = 'rgba(15,23,42,.55)'
    root.style.display = 'flex'
    root.style.alignItems = 'center'
    root.style.justifyContent = 'center'

    const panel = document.createElement('div')
    panel.style.width = '440px'
    panel.style.maxWidth = '92vw'
    panel.style.background = '#fff'
    panel.style.borderRadius = '14px'
    panel.style.padding = '12px'
    panel.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    panel.style.fontSize = '12px'
    panel.style.color = '#0f172a'
    panel.style.border = '1px solid #e2e8f0'
    panel.style.boxShadow = '0 30px 80px rgba(2,6,23,.30)'

    const close = (value: boolean) => {
      root.remove()
      document.removeEventListener('keydown', onKeyDown)
      resolve(Boolean(value))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
    }

    document.addEventListener('keydown', onKeyDown)
    root.addEventListener('click', () => close(false))
    panel.addEventListener('click', (event) => event.stopPropagation())

    const header = document.createElement('div')
    header.style.display = 'flex'
    header.style.alignItems = 'center'
    header.style.justifyContent = 'space-between'
    header.style.marginBottom = '10px'

    const title = document.createElement('div')
    title.textContent = isUpdate ? 'Update Credential?' : 'Save Credential?'
    title.style.fontWeight = '600'

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.width = '20px'
    closeBtn.style.height = '20px'
    closeBtn.style.border = '1px solid #cbd5e1'
    closeBtn.style.background = '#f8fafc'
    closeBtn.style.borderRadius = '4px'
    closeBtn.style.fontSize = '16px'
    closeBtn.style.cursor = 'pointer'
    closeBtn.style.color = '#334155'
    closeBtn.onclick = () => close(false)

    header.appendChild(title)
    header.appendChild(closeBtn)
    panel.appendChild(header)

    const desc = document.createElement('div')
    desc.style.fontSize = '13px'
    desc.style.marginBottom = '12px'
    desc.innerHTML = trustPolicy.createHTML(
      (isUpdate ? 'Update credential for ' : 'Save credential for ') + '<b>' + username + '</b> on <b>' + site + '</b>?'
    )
    panel.appendChild(desc)

    const actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.justifyContent = 'flex-end'
    actions.style.gap = '8px'

    const ignore = document.createElement('button')
    ignore.textContent = 'Ignore'
    ignore.style.height = '30px'
    ignore.style.padding = '0 10px'
    ignore.style.border = '1px solid #cbd5e1'
    ignore.style.borderRadius = '8px'
    ignore.style.background = '#e2e8f0'
    ignore.style.cursor = 'pointer'
    ignore.onclick = () => close(false)

    const save = document.createElement('button')
    save.textContent = isUpdate ? 'Update' : 'Save'
    save.style.height = '30px'
    save.style.padding = '0 10px'
    save.style.border = '1px solid transparent'
    save.style.borderRadius = '8px'
    save.style.background = '#4f46e5'
    save.style.color = '#fff'
    save.style.cursor = 'pointer'
    save.onclick = () => close(true)

    actions.appendChild(ignore)
    actions.appendChild(save)
    panel.appendChild(actions)
    root.appendChild(panel)
    document.documentElement.appendChild(root)
  })
}

export const openVaultManagerDialog = (input: any[]) => {
  const trustPolicy = (window as any)?.trustedTypes?.createPolicy('forceInner', {
    createHTML: (to_escape: string) => to_escape,
  })
  return new Promise((resolve) => {
    const old = document.getElementById('__minus_vault_manager')
    if (old) old.remove()

    const root = document.createElement('div')
    root.id = '__minus_vault_manager'
    root.style.position = 'fixed'
    root.style.inset = '0'
    root.style.zIndex = '2147483647'
    root.style.background = 'rgba(15,23,42,.55)'
    root.style.display = 'flex'
    root.style.alignItems = 'center'
    root.style.justifyContent = 'center'

    const panel = document.createElement('div')
    panel.style.width = '920px'
    panel.style.maxWidth = '96vw'
    panel.style.maxHeight = '80vh'
    panel.style.background = '#fff'
    panel.style.borderRadius = '14px'
    panel.style.border = '1px solid #e2e8f0'
    panel.style.boxShadow = '0 30px 80px rgba(2,6,23,.30)'
    panel.style.display = 'grid'
    panel.style.gridTemplateColumns = '320px 1fr'
    panel.style.overflow = 'hidden'
    panel.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    panel.style.fontSize = '12px'

    let items = (input || []).map((item) => ({ ...item }))
    let selectedId = items[0] ? items[0].id : null

    const close = (value: any) => {
      root.remove()
      document.removeEventListener('keydown', onKeyDown)
      resolve(value)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(items)
    }

    document.addEventListener('keydown', onKeyDown)
    root.addEventListener('click', () => close(items))
    panel.addEventListener('click', (event) => event.stopPropagation())

    const left = document.createElement('div')
    left.style.borderRight = '1px solid #e2e8f0'
    left.style.padding = '12px'
    left.style.overflow = 'auto'
    left.style.background = '#f8fafc'

    const right = document.createElement('div')
    right.style.padding = '12px'
    right.style.display = 'flex'
    right.style.flexDirection = 'column'
    right.style.gap = '8px'

    const icon = {
      plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
      trash:
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>',
      check:
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg>',
      x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      disk: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
    }

    const applyButtonBase = (btn: HTMLButtonElement) => {
      btn.style.display = 'inline-flex'
      btn.style.alignItems = 'center'
      btn.style.gap = '6px'
      btn.style.fontSize = '12px'
      btn.style.lineHeight = '1'
      btn.style.height = '30px'
      btn.style.padding = '0 10px'
      btn.style.borderRadius = '8px'
      btn.style.cursor = 'pointer'
      btn.style.border = '1px solid transparent'
    }

    const styleButton = (
      btn: HTMLButtonElement,
      normalBg: string,
      hoverBg: string,
      normalColor: string,
      border = 'transparent'
    ) => {
      btn.style.background = normalBg
      btn.style.color = normalColor
      btn.style.borderColor = border
      btn.onmouseenter = () => {
        btn.style.background = hoverBg
      }
      btn.onmouseleave = () => {
        btn.style.background = normalBg
      }
    }

    const getSelected = () => items.find((item) => item.id === selectedId)
    const uid = () => 'new-' + Math.random().toString(36).slice(2)

    const renderList = () => {
      left.innerHTML = trustPolicy.createHTML('')
      const title = document.createElement('div')
      title.textContent = 'Vault'
      title.style.fontWeight = '600'
      title.style.marginBottom = '8px'
      left.appendChild(title)

      const addBtn = document.createElement('button')
      addBtn.innerHTML = trustPolicy.createHTML(icon.plus + '<span>New</span>')
      applyButtonBase(addBtn)
      styleButton(addBtn, '#0f172a', '#1e293b', '#fff')
      addBtn.style.marginBottom = '8px'
      addBtn.onclick = () => {
        const item = {
          id: uid(),
          site: '',
          username: '',
          password: '',
          notes: '',
        }
        items.unshift(item)
        selectedId = item.id
        renderList()
        renderForm()
      }
      left.appendChild(addBtn)

      items.forEach((item) => {
        const btn = document.createElement('button')
        btn.style.display = 'block'
        btn.style.width = '100%'
        btn.style.textAlign = 'left'
        btn.style.marginBottom = '6px'
        btn.style.border = '1px solid #e2e8f0'
        btn.style.padding = '8px'
        btn.style.borderRadius = '8px'
        btn.style.cursor = 'pointer'
        btn.style.background = selectedId === item.id ? '#e2e8f0' : '#fff'
        btn.innerHTML = trustPolicy.createHTML(
          `<div style="font-weight:500;">Domain: ${item.site || 'new site'}</div>` +
            `<div style="font-weight:300;color:rgba(0,0,0,.8);margin-top:2px;">${item.username || 'unknown'}</div>`
        )
        btn.onclick = () => {
          selectedId = item.id
          renderList()
          renderForm()
        }
        left.appendChild(btn)
      })
    }

    const renderForm = () => {
      right.innerHTML = trustPolicy.createHTML('')
      const selected = getSelected()
      const title = document.createElement('div')
      title.textContent = selected ? 'Edit Credential' : 'Select Credential'
      title.style.fontWeight = '600'
      right.appendChild(title)
      if (!selected) return

      const mkInput = (labelText: string, value: string, type = 'text') => {
        const wrap = document.createElement('label')
        wrap.style.display = 'flex'
        wrap.style.flexDirection = 'column'
        wrap.style.gap = '4px'
        const label = document.createElement('span')
        label.textContent = labelText
        const input = document.createElement('input')
        input.type = type
        input.value = value || ''
        input.style.border = '1px solid #cbd5e1'
        input.style.padding = '8px'
        input.style.borderRadius = '8px'
        input.style.fontSize = '12px'
        wrap.appendChild(label)
        wrap.appendChild(input)
        return { wrap, input }
      }

      const mkArea = (labelText: string, value: string) => {
        const wrap = document.createElement('label')
        wrap.style.display = 'flex'
        wrap.style.flexDirection = 'column'
        wrap.style.gap = '4px'
        const label = document.createElement('span')
        label.textContent = labelText
        const area = document.createElement('textarea')
        area.value = value || ''
        area.style.border = '1px solid #cbd5e1'
        area.style.padding = '8px'
        area.style.borderRadius = '8px'
        area.style.minHeight = '90px'
        area.style.fontSize = '12px'
        wrap.appendChild(label)
        wrap.appendChild(area)
        return { wrap, area }
      }

      const site = mkInput('Domain', selected.site)
      const username = mkInput('Username / Email', selected.username)
      const password = mkInput('Password', selected.password, 'password')
      const notes = mkArea('Notes', selected.notes || '')

      right.appendChild(site.wrap)
      right.appendChild(username.wrap)
      right.appendChild(password.wrap)
      right.appendChild(notes.wrap)

      const actions = document.createElement('div')
      actions.style.display = 'flex'
      actions.style.justifyContent = 'space-between'
      actions.style.marginTop = 'auto'

      const del = document.createElement('button')
      del.innerHTML = trustPolicy.createHTML(icon.trash + '<span>Delete</span>')
      applyButtonBase(del)
      styleButton(del, '#fee2e2', '#fecaca', '#b91c1c', '#fecaca')
      del.onclick = () => {
        items = items.filter((item) => item.id !== selected.id)
        selectedId = items[0] ? items[0].id : null
        renderList()
        renderForm()
      }

      const rightActions = document.createElement('div')
      rightActions.style.display = 'flex'
      rightActions.style.gap = '8px'

      const commitSelection = () => {
        selected.site = site.input.value.trim()
        selected.username = username.input.value.trim()
        selected.password = password.input.value
        selected.notes = notes.area.value
      }

      const cancel = document.createElement('button')
      cancel.innerHTML = trustPolicy.createHTML(icon.x + '<span>Cancel</span>')
      applyButtonBase(cancel)
      styleButton(cancel, '#e2e8f0', '#cbd5e1', '#334155')
      cancel.onclick = () => close(null)

      const apply = document.createElement('button')
      apply.innerHTML = trustPolicy.createHTML(icon.check + '<span>Apply</span>')
      applyButtonBase(apply)
      styleButton(apply, '#0f172a', '#1e293b', '#fff')
      apply.onclick = () => {
        commitSelection()
        renderList()
      }

      const done = document.createElement('button')
      done.innerHTML = trustPolicy.createHTML(icon.disk + '<span>Done</span>')
      applyButtonBase(done)
      styleButton(done, '#4f46e5', '#4338ca', '#fff')
      done.onclick = () => {
        commitSelection()
        close(items)
      }

      rightActions.appendChild(cancel)
      rightActions.appendChild(apply)
      rightActions.appendChild(done)
      actions.appendChild(del)
      actions.appendChild(rightActions)
      right.appendChild(actions)
    }

    panel.appendChild(left)
    panel.appendChild(right)
    root.appendChild(panel)
    document.documentElement.appendChild(root)

    renderList()
    renderForm()
  })
}
