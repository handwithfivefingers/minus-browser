import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from '~/shared/types'

export class CaptureTabPlugin implements ITabPlugin {
  readonly name = 'capture'

  constructor(private emitToRenderer: (channel: string, data: any) => void) {}

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onConsoleMessage = (_ctx, msg) => this.handleConsoleMessage(ctx, msg)
  }

  private handleConsoleMessage(ctx: IExecutionContext, message: string) {
    if (!message.startsWith('__MINUS_CAPTURE_SELECTION__:')) return
    try {
      const rect = JSON.parse(message.slice('__MINUS_CAPTURE_SELECTION__:'.length))
      // console.log('rect', rect)
      this.emitToRenderer('CAPTURE_SELECTION_RESULT', { rect, tabId: ctx.tabId })
    } catch {
      // ignore
    }
  }
}
