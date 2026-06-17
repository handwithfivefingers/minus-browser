# Action Plan: Lazy Tab Restoration + Tab Hibernation

## Problem

**Startup:** `TabController.initialize()` recreates every persisted tab as a full `Tab` instance with its own `WebContentsView`. Each `Tab` constructor creates `WebContentsView`, registers 5 plugins (adblock, vault, translate, userscript, search), sets up events, creates context menu. With N tabs, N views are created at startup — causing ~2s delay.

**No hibernation:** Once created, `WebContentsView` lives forever, consuming memory (100-300MB each). No mechanism to free inactive tab resources.

## Goals

1. **Lazy restoration:** On startup, only create `WebContentsView` for the active tab. Other tabs restore metadata only; view created on first activation.
2. **Tab hibernation:** After a tab is inactive for N minutes, destroy its `WebContentsView`. Recreate on switch.

---

## Implementation

### Files to modify

| File | Changes |
|------|---------|
| `src/features/tabs/models/tab.ts` | Make `view` and `webContents` lazy; add `isHibernated`, `hibernate()`, `wake()`, `isAlive` |
| `src/features/tabs/controllers/index.ts` | Lazy init in `initialize()`; add `hibernateTab()`, `restoreTab()`, hibernate interval; rename `hibernateMapping` |
| `src/features/system/controller/viewController.ts` | Call `hibernate`/`restore` on show/hide; use `isAlive` in attach/detach |
| `src/shared/types/index.ts` (or `ITab`) | Add `isHibernated` field if needed |

### Step 1: Make `Tab.view` + `webContents` lazy

Convert `view` and `webContents` from eager instance properties to getters backed by a private method that creates them on first access:

```ts
private _view: WebContentsView | null = null;
private _webContents: Electron.WebContents | null = null;

get view(): WebContentsView {
  if (!this._view) this._createView();
  return this._view!;
}

get webContents(): Electron.WebContents {
  if (!this._webContents) this._createView();
  return this._webContents!;
}

private _createView() {
  this._view = new WebContentsView({ ... });
  this._webContents = this._view.webContents;
  this._view.setMaxListeners(30);
  this.createContextMenu();
  this.requestPermissions();
  this.registerCommonEvent();
}
```

Move plugin registration (`registerPlugin()`) out of constructor into a separate `initPlugins()` method called from `show()` instead of constructor.

Add properties:
```ts
isHibernated = false;
```

Add methods:
```ts
hibernate() {
  if (this.isHibernated || !this._view) return;
  this.url = this.webContents.getURL();
  this.title = this.webContents.getTitle();
  this._view.webContents.close();
  this._view = null;
  this._webContents = null;
  this.isHibernated = true;
}

wake() {
  if (!this.isHibernated) return;
  this._createView();
  this.pluginReady = this.registerPlugin();
  this.webContents.loadURL(this.url);
  this.isHibernated = false;
}

get isAlive() {
  return this._view !== null;
}

show() {
  if (this.isHibernated) this.wake();
  if (this._view && 'setVisible' in this._view && !this._view.getVisible()) {
    this._view.setVisible(true);
  }
  this.pluginReady?.then(() => this.pluginManager.attachTo(this));
}
```

### Step 2: Lazy tab restoration in `TabController.initialize()`

Change `initialize()` to only create the **last active tab** (or first tab if none) with a full view. For all others, create `Tab` without creating the view (do not touch `.view` getter):

```ts
// In Tab constructor — remove view creation from here
// Instead just assign props, don't create view
constructor({ eventEmitter, ...props }) {
  Object.assign(this, props);
  this.eventEmitter = eventEmitter;
  // Do NOT call _createView() here
  // Do NOT set up events here
}
```

Create the active tab's view eagerly:

```ts
const tab = tabs[idx];
const newTab = new Tab({ ...tab, eventEmitter: this.eventEmitter });

// Only create view for the active/last-focused tab
if (idx === lastActiveIndex) {
  newTab._createView(); // force eager creation of view + plugins
}
```

Need to determine which tab was active. Requires persisting `activeTabId` or the `index` of the active tab. Currently `userStore` saves `{ tabs, index }` but `index` is just a counter, not the active tab index.

**Add `activeTabId` to persisted data:**

```ts
// TabController.persist() / userStore.saveFiles
const data = {
  tabs: this.getTabs(),
  index: this.index,
  activeTabId: this.activeTab?.id || null,
};
```

**On restore**, after building tabs map, set `activeTabId` from persisted data and create view for that tab.

### Step 3: Tab hibernation interval

In `TabController`, add a periodic timer that hibernates inactive tabs:

```ts
private hibernateTimer: ReturnType<typeof setInterval> | null = null;
private readonly HIBERNATE_AFTER_MS = 30 * 60 * 1000; // 30 min

startHibernateTimer() {
  this.stopHibernateTimer();
  this.hibernateTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, tab] of this.tabs) {
      if (id === this.activeTab?.id) continue;
      if (tab.isPinned) continue;           // skip pinned tabs
      if (tab.isHibernated) continue;       // already hibernated
      if (!tab.isAlive) continue;           // no view created yet
      if (now - tab.timestamp > this.HIBERNATE_AFTER_MS) {
        tab.hibernate();
      }
    }
  }, 60_000); // check every 60s
}

stopHibernateTimer() {
  if (this.hibernateTimer) {
    clearInterval(this.hibernateTimer);
    this.hibernateTimer = null;
  }
}
```

Call `startHibernateTimer()` in `initialize()`, `stopHibernateTimer()` in a `destroy()` method.

### Step 4: Wire into `ViewController`

In `handleShowViewById()`:
- Before calling `currentTab.show()`, check `currentTab.isHibernated` and call `wake()`.

In `handleHideView()`:
- Optionally hibernate immediately (for aggressive mode) or let the timer handle it.

In `onCloseTab()`:
- Before closing, if tab is hibernated, just remove from map (no view to clean).

In `attachChildView()` / `detachChildView()`:
- Guard against null view (when tab is hibernated, view is null).

### Step 5: Persist/Restore active tab info

In `userStore.saveFiles()` (called via `persist()` in `ViewController`), save `activeTabId`.

During `TabController.initialize()`, after restoring tabs, find the tab matching `activeTabId` and create its view eagerly:

```ts
const stored = await cacheSystem.get("tab", ...);
const activeTabId = stored?.activeTabId;
// ... build tabs ...
if (activeTabId && this.tabs.has(activeTabId)) {
  this.activeTab = this.tabs.get(activeTabId)!;
  this.activeTab._createView(); // eager
} else if (this.tabs.size > 0) {
  this.activeTab = this.tabs.values().next().value;
  this.activeTab._createView();
}
```

### Step 6: Handle edge cases in `ViewController`

- `handleShowViewById` → wake tab first
- `handleHideView` → no-op if view is null
- `handleURLChange` → if tab is hibernated, wake it first
- `handleReloadTab` → if hibernated, wake
- `requestPIP` → if hibernated, wake
- `handleToggleDevTools` → if not `isAlive`, return early

---

## Edge Cases & Risks

| Edge Case | Handling |
|-----------|----------|
| Hibernate active tab | Never — skip via `id === this.activeTab?.id` |
| Hibernate pinned tab | Never — skip via `tab.isPinned` |
| Close hibernated tab | No view cleanup needed, just delete from map |
| Close active tab → next tab is hibernated | Wake the next tab before attaching its view |
| Crash during hibernate | Safe — view.webContents.close() can throw; wrap in try/catch |
| Tab URL changed while hibernated | Can't happen — no webContents to change URL. URL is frozen from last hibernate |
| User switches back during hibernate write | Lock with a promise that awaits `_createView()` completion; queue switch if already hibernating |

---

## Verification

1. Open app → only active tab creates a view (check `task manager` or `process.memoryUsage()`)
2. Switch to another tab → its view is created lazily
3. Leave tab inactive for 30min → view is destroyed (memory freed)
4. Switch back to hibernated tab → view recreated, page reloads at last URL
5. Restart app → only active tab's view is created on startup
6. Close hibernated tab → no errors, other tabs unaffected
