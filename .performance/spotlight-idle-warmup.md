# Spotlight Idle-Time Warmup

## Problem

`spotlightController.warmup()` in `src/core/controller/viewController.ts:131-133` runs eagerly during `init()`'s `finally` block. While it doesn't block the critical path (it's not awaited), it competes for CPU and memory resources during the crucial first-paint window, potentially delaying the renderer's initial render.

## Constraint

Spotlight must open/close instantly when triggered (Cmd+K), so warmup must happen before first use.

## Solution

Shift warmup from immediate execution to `setImmediate()` (Node.js main-process equivalent):

```typescript
finally {
  spotlightController.init(this.window);
  setImmediate(() => spotlightController.warmup().catch(() => {}));
}
```

This defers the expensive WebContentsView creation + React bundle load to after I/O callbacks complete, giving the main window's first paint priority.

### Impact

- Frees up resources during critical first-paint window
- Warmup still completes before user typically presses Cmd+K (within a few hundred ms)
- No change to warmup behavior or spotlight responsiveness
