import { ipcMain } from 'electron'

import { passwordController } from './passwordController'

export interface IVaultPageIpcDeps {
  isVaultEnabled: () => boolean
  getNeverSaveDomains: () => string[]
  findTabId: (wc: Electron.WebContents) => string | undefined
  onCredentialDetected: (payload: { tabId?: string; hostname: string; username: string; password: string }) => void
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//.test(url)
}

/**
 * Frame-aware page <-> main bridge (MinBrowser-style).
 *
 * Page preload sends password-autofill / password-autofill-check /
 * password-form-filled. Replies are scoped to the requesting frame via
 * senderFrame + frameId + sendToFrame so credential data never leaks to a
 * different frame (e.g. a login form inside an iframe).
 */
export function registerVaultPageIpc(deps: IVaultPageIpcDeps): void {
  ipcMain.on('password-autofill', async (event) => {
    if (!deps.isVaultEnabled()) return

    const frameURL = event.senderFrame?.url
    if (!frameURL || !isHttpUrl(frameURL)) return

    let hostname = ''
    try {
      hostname = new URL(frameURL).hostname
    } catch {
      return
    }
    if (!hostname) return

    try {
      const credentials = await passwordController.getByDomain(hostname)
      event.sender.sendToFrame(event.frameId, 'password-autofill-match', {
        hostname,
        credentials: credentials.map((c) => ({ username: c.username, password: c.password })),
      })
    } catch (error) {
      console.error('password-autofill failed', error)
    }
  })

  ipcMain.on('password-autofill-check', (event) => {
    const frameURL = event.senderFrame?.url
    if (!frameURL || !isHttpUrl(frameURL)) return
    event.sender.sendToFrame(event.frameId, 'password-autofill-enabled', deps.isVaultEnabled())
  })

  ipcMain.on('password-form-filled', (event, args) => {
    if (!deps.isVaultEnabled()) return

    const [domain, username, password] = Array.isArray(args) ? args : []
    if (!domain || !password) return

    let hostname = String(domain).replace(/^www\./, '')
    try {
      hostname = new URL(`https://${hostname}`).hostname.replace(/^www\./, '')
    } catch {
      // keep the raw hostname
    }
    if (!hostname) return

    if (deps.getNeverSaveDomains().includes(hostname)) return

    deps.onCredentialDetected({
      tabId: deps.findTabId(event.sender),
      hostname,
      username: username || '',
      password,
    })
  })
}
