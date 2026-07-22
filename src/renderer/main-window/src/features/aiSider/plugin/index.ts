import { IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from '~/shared/types'

import { AI_SELECTION_SCRIPT } from './constants/aiSelectionScript'

export class AiTabPlugin implements ITabPlugin {
  readonly name = 'aiSidebar'

  constructor(private emitToRenderer: (channel: string, data: any) => void) {}

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onDidStopLoad = () => this.installAiSelectionCapture(ctx)
    hooks.onConsoleMessage = (_ctx, msg) => this.handleConsoleMessage(ctx, msg)
    try {
      if (!ctx.webContents.isLoading() && ctx.webContents.getURL()) {
        this.installAiSelectionCapture(ctx)
      }
    } catch {
      // best effort
    }
  }

  private async installAiSelectionCapture(ctx: IExecutionContext) {
    try {
      await ctx.webContents.executeJavaScript(AI_SELECTION_SCRIPT, true)
    } catch {
      // best effort
    }
  }

  private handleConsoleMessage(ctx: IExecutionContext, message: string) {
    if (!message.startsWith('__MINUS_AI_SELECTION__:')) return
    try {
      const payload = JSON.parse(message.slice('__MINUS_AI_SELECTION__:'.length))
      const text = String(payload?.text || '').trim()
      if (!text) return
      this.emitToRenderer(IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE, {
        tabId: ctx.tabId,
        text,
        action: payload?.action || 'explain',
        url: payload?.url || ctx.url,
      })
    } catch {
      // ignore malformed payloads
    }
  }
}
