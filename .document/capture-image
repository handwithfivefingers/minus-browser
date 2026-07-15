# Capture Page / Capture Selection — Implementation Plan

## Overview
Add a **Capture** feature that takes screenshots of web pages using `webContents.capturePage()`. Triggered from toolbar + context menu, integrates with the AI sidebar, saves to clipboard. Uses `WebContentsView` (SubWindowService overlay) — no `BrowserView`.

---

## 1. Architecture

### Flow Diagrams

**Capture Page:**
```
User clicks toolbar "Capture Page"
  → renderer IPC emit "send" → channel: "CAPTURE_PAGE"
  → ViewController.onListener → captureController.capturePage()
  → activeTab.webContents.capturePage() → NativeImage
  → image.toDataURL()
  → subWindowService.open("/capture", { image, type: "page" })
  → Capture overlay shows image
  → User clicks "Copy to clipboard" → clipboard.writeImage(nativeImage)
  → (optional) forwardRendererEvent("CAPTURE_RESULT", { image, tabId })
  → AI sidebar CaptureMode receives and displays it
```

**Capture Selection:**
```
User right-click → "Capture Selection" (or toolbar dropdown)
  → Inject selection script into active tab
  → Dark overlay appears, user drags a rectangle
  → On mouseup: console.log("__MINUS_CAPTURE_SELECTION__:" + JSON.stringify({ x, y, w, h }))
  → CaptureTabPlugin.handleConsoleMessage() parses coordinates
  → capturePage({ x, y, width, height }) → same overlay flow as above
```

### Overlay Pattern
Use the existing **SubWindowService** (shared `WebContentsView`) — register a new `/capture` route, following vault/translate/spotlight conventions. No new Vite renderer entry needed.

### Integration Points

| Integration | Detail |
|-------------|--------|
| **Toolbar** | Camera icon button + dropdown: "Capture Page" / "Capture Selection" |
| **Context menu** | Right-click on page → "Capture Page" / "Capture Selection" |
| **Keyboard shortcut** | `Ctrl+Shift+S` (or similar) — future |
| **AI sidebar** | New `"capture"` mode showing screenshot + AI actions |

---

## 2. Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `src/features/capture/services/index.ts` | `capturePage(webContents, rect?)` → calls `webContents.capturePage(rect)`, returns NativeImage converted to data URL |
| 2 | `src/features/capture/controllers/index.ts` | Subscribes to `viewChanges`, exposes `capturePage()`/`captureSelection()` methods, handles IPC invoke/emit |
| 3 | `src/features/capture/overlay/App.tsx` | React component: displays captured image, "Copy to clipboard" button, close |
| 4 | `src/features/capture/overlay.register.ts` | `register({ path: "/capture", component: CapturePage, shell: true })` |
| 5 | `src/features/capture/plugin/index.ts` | `CaptureTabPlugin`: injects selection script, handles `console-message` for region coords |
| 6 | `src/features/capture/plugin/selectionScript.ts` | Injected JS: darkened overlay, drag-to-select rectangle, sends coordinates via sentinel |
| 7 | `src/features/capture/index.ts` | Exports |

## 3. Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/shared/constants/ipc.ts` | Add `CAPTURE_PAGE`, `CAPTURE_SELECTION` to `IPC_INVOKE_CHANNEL` |
| 2 | `src/main/core/controller/viewController.ts` | Add invoke handlers for `CAPTURE_PAGE`/`CAPTURE_SELECTION`; wire `captureController` |
| 3 | `src/features/tabs/models/tab.ts` | Register `CaptureTabPlugin` in `registerPlugin()` |
| 4 | `src/renderer/main-window/src/features/aiSider/stores/useAiSidebarStore.ts` | Add `capturedImage: string | null` state, extend `AiSidebarMode` with `"capture"` |
| 5 | `src/renderer/main-window/src/features/aiSider/components/AiSidebar.tsx` | Add Capture tab (camera icon), render `<CaptureMode />` |
| 6 | `src/renderer/main-window/src/features/aiSider/modes/CaptureMode.tsx` | New: shows captured screenshot thumbnail + AI action buttons |
| 7 | `src/main/core/controller/context/index.ts` | Add "Capture Page" / "Capture Selection" context menu items |
| 8 | `src/renderer/main-window/src/components/toolbar/index.tsx` (or similar) | Add camera icon button with dropdown |

## 4. IPC Channels

```typescript
// In src/shared/constants/ipc.ts

IPC_INVOKE_CHANNEL: {
  CAPTURE_PAGE: "CAPTURE_PAGE",           // Capture visible viewport
  CAPTURE_SELECTION: "CAPTURE_SELECTION", // Enter region selection mode
}

IPC_RENDERER_EVENT: {
  CAPTURE_RESULT: "CAPTURE_RESULT",       // Send captured image data to renderer
}
```

## 5. Region Selection Script (`selectionScript.ts`)

```typescript
export const CAPTURE_SELECTION_SCRIPT = `
(function() {
  if (document.getElementById("__minus_capture_overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "__minus_capture_overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;";

  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.3);pointer-events:none;";

  const selection = document.createElement("div");
  selection.style.cssText = `position:absolute;border:2px solid #4f46e5;background:rgba(79,70,229,0.1);display:none;pointer-events:none;`;

  const instruction = document.createElement("div");
  instruction.textContent = "Drag to select a region. Press Esc to cancel.";
  instruction.style.cssText = "position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:8px 16px;border-radius:8px;font:12px sans-serif;z-index:1;";

  overlay.appendChild(backdrop);
  overlay.appendChild(selection);
  overlay.appendChild(instruction);
  document.documentElement.appendChild(overlay);

  let startX = 0, startY = 0, drawing = false;

  overlay.addEventListener("mousedown", (e) => {
    drawing = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.cssText += \`left:\${startX}px;top:\${startY}px;width:0;height:0;display:block;\`;
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selection.style.left = x + "px";
    selection.style.top = y + "px";
    selection.style.width = w + "px";
    selection.style.height = h + "px";
  });

  overlay.addEventListener("mouseup", (e) => {
    if (!drawing) return;
    drawing = false;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    overlay.remove();
    console.log("__MINUS_CAPTURE_SELECTION__:" + JSON.stringify({ x, y, w, h }));
  });

  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", onEsc);
    }
  });
})();
`;
```

## 6. Plugin Pattern (`plugin/index.ts`)

Follows the existing `AiTabPlugin` pattern:

```typescript
export class CaptureTabPlugin implements ITabPlugin {
  readonly name = "capture";

  constructor(private emitToRenderer: (channel: string, data: any) => void) {}

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onConsoleMessage = (_ctx, msg) => this.handleConsoleMessage(ctx, msg);
  }

  private handleConsoleMessage(ctx: IExecutionContext, message: string) {
    if (!message.startsWith("__MINUS_CAPTURE_SELECTION__:")) return;
    try {
      const rect = JSON.parse(message.slice("__MINUS_CAPTURE_SELECTION__:".length));
      // rect = { x, y, w, h }
      this.emitToRenderer("CAPTURE_SELECTION_RESULT", { rect, tabId: ctx.tabId });
    } catch { /* ignore malformed */ }
  }
}
```

## 7. AI Sidebar Integration

- Add `"capture"` to `AiSidebarMode` type
- `CaptureMode.tsx` shows the captured image thumbnail with action buttons: "Describe this image", "Extract text"
- Image data forwarded from capture controller via `forwardRendererEvent("CAPTURE_RESULT", { image, tabId })`
- AI actions require **multimodal LLM support** (GPT-4 Vision / Claude) — stub initially

## 8. Phases

| Phase | What | Est. Time | Complexity |
|-------|------|-----------|------------|
| **1** | Capture service + controller + IPC handlers | 2-3h | Medium |
| **2** | SubWindow overlay (App.tsx + register) | 1-2h | Low |
| **3** | Tab plugin + region selection script | 2-3h | Medium |
| **4** | Toolbar button + context menu triggers | 1-2h | Low |
| **5** | AI sidebar Capture mode | 1-2h | Low |
| **6** | Clipboard integration | 0.5h | Low |
| **7** | Keyboard shortcut (`Ctrl+Shift+S`) | 0.5h | Low |
| | **Total** | **8-13h** | |
