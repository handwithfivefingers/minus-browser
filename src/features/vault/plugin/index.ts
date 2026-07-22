import { WebContents } from 'electron'

import { IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from '~/shared/types'

import { CAPTURE_CREDENTIAL_SCRIPT, CREDENTIAL_ASSIST_SCRIPT } from '../constants'
import { VaultController } from '../controllers'
import { VaultServices } from '../services'

export class VaultTabPlugin implements ITabPlugin {
  readonly name = 'vault'
  vaultController = new VaultController()
  vaultService = new VaultServices()
  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    this.emitToRenderer = emitToRenderer
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onDidStopLoad = () => this.installCredentialAssist(ctx)
    hooks.onWillNavigate = () => this.captureCredentialBeforeNavigate(ctx)
    hooks.onConsoleMessage = async (_ctx, msg) => {
      if (msg === '__MINUS_FILL_PASSWORD_REQUEST__') {
        const creds = await this.vaultController.getVaults()
        const matched = creds.filter((v) => ctx.url.includes(v.site))
        if (matched?.length > 0) {
          const selected = await this.vaultService.selectCredential(ctx.webContents as WebContents, matched)
          const candicateSelected = matched.find((v) => v.id === selected)
          if (candicateSelected) {
            const scriptInjection = this.vaultController.getDialogScriptInjection(candicateSelected)
            ctx.webContents.executeJavaScript(scriptInjection, true)
          }
        }
        return
      }

      const VAULT_CAPTURE_PREFIX = '__MINUS_VAULT_CAPTURE__'
      if (msg.startsWith(VAULT_CAPTURE_PREFIX)) {
        try {
          const payload = JSON.parse(msg.slice(VAULT_CAPTURE_PREFIX.length))
          if (payload?.password) {
            this.emitToRenderer(IPC_RENDERER_EVENT.VAULT_CREDENTIAL_DETECTED, {
              tabId: ctx.tabId,
              ...payload,
            })
          }
        } catch {
          // ignore malformed messages
        }
      }
    }
  }

  private async installCredentialAssist(ctx: IExecutionContext) {
    await ctx.webContents.executeJavaScript(CREDENTIAL_ASSIST_SCRIPT, true)
  }

  private async captureCredentialBeforeNavigate(ctx: IExecutionContext) {
    const payload = await ctx.webContents.executeJavaScript(CAPTURE_CREDENTIAL_SCRIPT, true)
    if (!payload?.password) return
    this.emitToRenderer(IPC_RENDERER_EVENT.VAULT_CREDENTIAL_DETECTED, {
      tabId: ctx.tabId,
      ...payload,
    })
  }
}
