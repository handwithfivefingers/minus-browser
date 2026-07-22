import { IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from '~/shared/types'

export class TranslateTabPlugin implements ITabPlugin {
  readonly name = 'translate'
  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    this.emitToRenderer = emitToRenderer
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onDidStopLoad = async () => {
      await this.detectPageLanguage(ctx)
      await this.installSelectionCapture(ctx)
    }
    hooks.onConsoleMessage = (_ctx, msg) => this.handleConsoleMessage(ctx, msg)
  }

  private async detectPageLanguage(ctx: IExecutionContext) {
    try {
      const payload = await ctx.webContents.executeJavaScript(
        `(() => {
          const htmlLang = String(document.documentElement?.lang || "").trim().toLowerCase();
          const title = String(document.title || "").trim();
          const bodyText = String(document.body?.innerText || "").trim().slice(0, 2000);
          return {
            htmlLang,
            textSample: [title, bodyText].filter(Boolean).join("\\n").slice(0, 2000),
            url: window.location.href
          };
        })();`,
        true
      )
      const rawLanguage = String(payload?.htmlLang || '').split('-')[0]
      if (!rawLanguage || rawLanguage === 'en') return
      this.emitToRenderer(IPC_RENDERER_EVENT.TRANSLATE_LANGUAGE_DETECTED, {
        tabId: ctx.tabId,
        language: rawLanguage,
        url: payload?.url || ctx.url,
        textSample: payload?.textSample || '',
      })
    } catch {
      // best effort
    }
  }

  private async installSelectionCapture(ctx: IExecutionContext) {
    try {
      await ctx.webContents.executeJavaScript(
        `(() => {
          if (window.__minusSelectionCaptureMounted) return;
          window.__minusSelectionCaptureMounted = true;
          if (!window.__minusSelectionAnchor) window.__minusSelectionAnchor = null;
          document.addEventListener("mousemove", (event) => {
            window.__minusSelectionAnchor = { x: event.clientX, y: event.clientY };
          }, true);
          const notify = () => {
            const text = String(window.getSelection?.()?.toString?.() || "").trim().slice(0, 4000);
            if (!text) return;
            try {
              const selection = window.getSelection?.();
              const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
              if (range) {
                const rect = range.getBoundingClientRect();
                window.__minusSelectionAnchor = { x: rect.left, y: rect.bottom };
              }
            } catch (error) {}
            console.log("__MINUS_SELECTION_CAPTURE__:" + JSON.stringify({
              text,
              url: window.location.href,
              anchor: window.__minusSelectionAnchor || null
            }));
          };
          document.addEventListener("selectionchange", () => {
            clearTimeout(window.__minusSelectionCaptureTimer);
            window.__minusSelectionCaptureTimer = setTimeout(notify, 120);
          });
        })();`,
        true
      )
    } catch {
      // best effort
    }
  }

  private handleConsoleMessage(ctx: IExecutionContext, message: string) {
    if (!message.startsWith('__MINUS_SELECTION_CAPTURE__:')) return
    try {
      const payload = JSON.parse(message.slice('__MINUS_SELECTION_CAPTURE__:'.length))
      const text = String(payload?.text || '').trim()
      if (!text) return
      this.emitToRenderer(IPC_RENDERER_EVENT.TRANSLATE_SELECTION_AVAILABLE, {
        tabId: ctx.tabId,
        text,
        url: payload?.url || ctx.url,
      })
    } catch {
      // ignore malformed console payloads
    }
  }
}
