# Tab Group Feature

## Overview

Add tab group functionality similar to Chrome/Safari tab groups — users can create named, color-coded groups of tabs that visually collapse/expand in the sidebar.

---

## 1. Data Model

### `ITabGroup` type (`src/shared/types/tab-group.d.ts`)

```ts
export interface ITabGroup {
  id: string;
  name: string;
  color: string;          // hex or named color for the group indicator
  tabIds: string[];       // ordered list of tab IDs in the group
  hidden: boolean;        // whether the group is hidden from sidebar
  collapsed: boolean;     // whether the group is collapsed in the sidebar
  createdAt: number;
  updatedAt: number;
}
```

### Modified: `ITab` (`src/shared/types/tab.d.ts`)

Add optional `groupId` field:

```ts
export interface ITab {
  // ... existing fields
  groupId?: string;       // references ITabGroup.id
}
```

---

## 2. Backend (Main Process)

### `src/features/tabGroup/controllers/index.ts` — `TabGroupController`

```ts
class TabGroupController {
  groups: Map<string, ITabGroup>;

  async createGroup(name: string, color?: string, tabIds?: string[]): Promise<ITabGroup>;
  async deleteGroup(id: string): Promise<void>;
  async renameGroup(id: string, name: string): Promise<void>;
  async setGroupColor(id: string, color: string): Promise<void>;
  async addTabToGroup(groupId: string, tabId: string): Promise<void>;
  async removeTabFromGroup(groupId: string, tabId: string): Promise<void>;
  async removeTabFromGroupByTabId(tabId: string): Promise<void>;  // when tab is closed
  getGroupByTabId(tabId: string): ITabGroup | undefined;
  getGroups(): ITabGroup[];
  async toggleCollapse(id: string): Promise<void>;
  async reorderTabsInGroup(groupId: string, orderedTabIds: string[]): Promise<void>;
  async hideGroup(id: string): Promise<void>;    // sets hidden=true, keeps group data
  async unhideGroup(id: string): Promise<void>;  // sets hidden=false
  private async syncCache(): Promise<void>;  // persists to cacheSystem + userData.json
  initialize(): Promise<void>;  // load from userData.json via cacheSystem
}
```

All mutation methods are `async` and `await syncCache()`, which writes to both in-memory cache (`cacheSystem.set`) and disk (`StoreManager.saveFiles`) on every mutation.

---

## 3. IPC Architecture

### `src/shared/constants/ipc/tabGroup.ts`

```ts
export const IPC_TAB_GROUP_INVOKE = {
  CREATE_TAB_GROUP: "CREATE_TAB_GROUP",
  DELETE_TAB_GROUP: "DELETE_TAB_GROUP",
  RENAME_TAB_GROUP: "RENAME_TAB_GROUP",
  SET_TAB_GROUP_COLOR: "SET_TAB_GROUP_COLOR",
  ADD_TAB_TO_GROUP: "ADD_TAB_TO_GROUP",
  REMOVE_TAB_FROM_GROUP: "REMOVE_TAB_FROM_GROUP",
  GET_TAB_GROUPS: "GET_TAB_GROUPS",
  TOGGLE_TAB_GROUP_COLLAPSE: "TOGGLE_TAB_GROUP_COLLAPSE",
  REORDER_TABS_IN_GROUP: "REORDER_TABS_IN_GROUP",
  HIDE_GROUP: "HIDE_GROUP",
  UNHIDE_GROUP: "UNHIDE_GROUP",
} as const;

export const IPC_TAB_GROUP_EMIT = {
  SHOW_TAB_GROUP_CONTEXT_MENU: "SHOW_TAB_GROUP_CONTEXT_MENU",
} as const;

export const IPC_TAB_GROUP_RENDERER_EVENT = {
  TAB_GROUP_UPDATED: "TAB_GROUP_UPDATED",
} as const;
```

---

## 4. UI Components

### `TabGroupHeader` (`src/features/ui/components/tabGroup/TabGroupHeader.tsx`)

Renders the group header row with:

| Element | Behavior |
|---------|----------|
| **Group name** | `text-[10px]`, uppercase, truncated. On hover, name becomes invisible and Edit/Delete buttons appear as an **absolute overlay** on top. |
| **Edit button** (pencil) | Opens the **overlay modal** (`SHOW_TAB_GROUP_CONTEXT_MENU` with `editGroup` payload), showing pre-filled name + color picker. |
| **Delete button** (trash) | Calls `DELETE_TAB_GROUP` via IPC. |
| **Hide toggle** (eye/eye-off) | Toggles `group.hidden`. Hidden groups are **removed from the sidebar** but still accessible via the **Group button** in the sidebar footer (see below). |
| **Count badge** | Pill badge showing number of tabs, tinted with group color. |

### `TabGroupContainer` (`src/features/ui/components/tabGroup/index.tsx`)

Wraps a group with the following layout order:
1. `TabGroupHeader` (name + controls)
2. **Tab list** — scrollable, capped at **max 5 visible tabs** (`MAX_TAB_LIST_HEIGHT`)
3. **Collapse/Expand button** — chevron at the **bottom** of the container

```
┌──────────────────────────┐
│ Group Name   [count] 🔒 │  ← TabGroupHeader
├──────────────────────────┤
│ tab 1                    │
│ tab 2                    │  ← Tab list (scrollable, max 5)
│ tab 3                    │
├──────────────────────────┤
│          ▲/▼             │  ← Collapse/Expand at bottom
└──────────────────────────┘
```

### Overlay App (`src/features/tabGroup/overlay/App.tsx`)

The overlay (WebContentsView above tabs) supports:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Context menu** | Right-click tab or group header | Shows "Add to group" list, "New group", "Remove from group", "Close all tabs", "Open all tabs", "Delete group" |
| **Create group** | "New group" in context menu | Name input + color swatches, "Create" button |
| **Edit group** | Click Edit (pencil) on group header | Same form pre-filled, "Save" button calls `RENAME_TAB_GROUP` + `SET_TAB_GROUP_COLOR` |

### Sidebar (`src/features/ui/components/sidebar/index.tsx`)

**Group rendering:**
- Only non-hidden groups (`!group.hidden`) are rendered in the sidebar
- Hidden groups are filtered out via `visibleGroups`
- Tab groups section appears between pinned tabs and ungrouped tabs

**Group button** (sticky footer):
- Opens the overlay WebContentsView (context menu)
- Shows "Add to group" / "New group" / "Remove from group" actions
- Not a dropdown — uses the overlay pattern for visibility above tab content

**Drag & drop:**
- Within-group drag: same logic as flat list, scoped to tabs within the same group
- Cross-group drag: changes `groupId` via `ADD_TAB_TO_GROUP` / `REMOVE_TAB_FROM_GROUP`
- Drag onto group header: adds tab to that group

---

## 5. Persistence

Tab groups saved to SQLite `tab_groups` table via `appDb`.

### Schema (`tab_groups` table)

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT PK` | UUID v7 |
| `name` | `TEXT` | Group display name |
| `color` | `TEXT` | Hex color (e.g. `#6366f1`) |
| `hidden` | `INTEGER` | `0` or `1` |
| `collapsed` | `INTEGER` | `0` or `1` |
| `created_at` | `INTEGER` | Unix ms timestamp |
| `updated_at` | `INTEGER` | Unix ms timestamp |
| `tab_ids` | `TEXT` | JSON array of tab IDs (e.g. `["id1","id2"]`) |

### Two-tier persistence

| Layer | Mechanism | When |
|-------|-----------|------|
| **In-memory cache** | `cacheSystem.set("tabGroups", data)` | On every mutation via `syncCache()` |
| **SQLite (tab_groups)** | `appDb.transaction → INSERT INTO tab_groups (..., tab_ids)` | On every mutation via `syncCache()` + on app close via `persist()` |

### Startup restore

`initialize()` queries `SELECT * FROM tab_groups` and parses `tab_ids` via `JSON.parse(r.tab_ids)` to rebuild the in-memory `Map<string, ITabGroup>` with correct tab membership.

---

## 6. UX Considerations

| Scenario | Behavior |
|----------|----------|
| **Create group** | Right-click tab → "Add to group" → "New group" (opens overlay). Or "Group" button in sidebar → "New group". |
| **Add tab to group** | Right-click tab → "Add to group" → select group. Or drag tab onto group header. |
| **Remove tab from group** | Right-click tab → "Remove from group". Or drag tab out of group area. |
| **Collapse/expand** | Click bottom chevron. Collapsed groups show only the header. |
| **Delete group** | Right-click group header → "Delete group". Tabs are ungrouped (not closed). |
| **Close group** | Right-click group header → "Close all tabs". All tabs closed; empty group auto-deleted. |
| **Open group tabs** | Right-click group header → "Open all tabs". Navigates to/focuses each tab. |
| **Hide group** | Click eye-off icon on group header. Group removed from sidebar; tabs still exist. Re-access via right-click or "Group" button + overlay. |
| **Edit group** | Click pencil icon on group header. Overlay opens with name + color picker; "Save" updates both. |
| **Reorder within group** | Drag tabs within the group (same drag system as current unpinned tabs). |
| **Reorder groups** | Drag group headers to reorder groups relative to each other. |
| **Pinned + grouped** | Pinned tabs are not groupable (pinned state takes precedence). |

## 7. Files to Create

| File | Purpose |
|------|---------|
| `src/shared/types/tab-group.d.ts` | `ITabGroup` interface |
| `src/shared/constants/ipc/tabGroup.ts` | Tab group IPC channel constants |
| `src/features/tabGroup/controllers/index.ts` | `TabGroupController` |
| `src/features/tabGroup/index.ts` | Barrel export |
| `src/core/controller/tabGroup/tabGroupRoute.ts` | IPC handlers for tab groups |
| `src/features/ui/stores/useTabGroupStore.ts` | Zustand store for renderer |
| `src/features/ui/components/tabGroup/TabGroupHeader.tsx` | Group header with overlay Edit/Delete, Hide toggle |
| `src/features/ui/components/tabGroup/index.tsx` | Group container (header + scrollable tabs + collapse at bottom) |
| `src/features/ui/components/tabGroup/styles.module.css` | Group styles (container, scrollbar, collapse button, empty state) |
| `src/features/tabGroup/service/TabGroupOverlayService.ts` | WebContentsView lifecycle for overlay |
| `src/features/tabGroup/service/index.ts` | Barrel export |
| `src/features/tabGroup/controller/TabGroupOverlayController.ts` | Overlay controller wrapper |
| `src/features/tabGroup/controller/index.ts` | Barrel export |
| `src/features/tabGroup/overlay/index.html` | Overlay entry HTML |
| `src/features/tabGroup/overlay/main.tsx` | Overlay React root |
| `src/features/tabGroup/overlay/App.tsx` | Overlay React app (context menu + create/edit group form) |
| `src/features/tabGroup/overlay/assets/styles.css` | Overlay Tailwind import |
| `vite.tabgroup.renderer.config.ts` | Vite config for overlay renderer |

## 8. Files to Modify

| File | Change |
|------|--------|
| `src/shared/types/tab.d.ts` | Add `groupId?: string` to `ITab` |
| `src/shared/types/tab-group.d.ts` | Add `hidden: boolean` field |
| `src/shared/constants/ipc/tabGroup.ts` | Add `HIDE_GROUP`, `UNHIDE_GROUP` IPC invoke channels |
| `src/features/tabGroup/controllers/index.ts` | Add `hideGroup()`/`unhideGroup()` methods; `hidden` field in `createGroup()` |
| `src/features/sub-window/ipc/tabgroup-handlers.ts` | Wire `HIDE_GROUP`/`UNHIDE_GROUP` IPC handlers |
| `src/features/tabGroup/overlay/App.tsx` | Support edit mode (`editGroup` payload); add "Open all tabs" action |
| `src/features/ui/components/sidebar/index.tsx` | Render group headers; filter hidden groups (`visibleGroups`); Group button opens overlay; update drag system for group-aware moves |
| `src/features/ui/components/sidebar/styles.module.css` | Group-specific styles |
| `src/features/ui/components/tab/index.tsx` | Accept `groupColor` prop for optional left-border indicator |
| `src/features/ui/components/tabGroup/TabGroupHeader.tsx` | Edit/Delete as absolute overlay on name hover; Edit opens overlay modal; Hide Group toggle button |
| `src/features/ui/components/tabGroup/index.tsx` | Layout: name → count → scrollable tab list (max 5) → collapse/expand at bottom |
| `src/features/ui/components/tabGroup/styles.module.css` | Collapse button style, empty state, scrollbar, spacing |
| `src/interface.d.ts` | Add `TAB_GROUP_UPDATED` to `LISTENER_CHANNEL` |
| `src/features/ui/interfaces/tab.d.ts` | Add `groupId` to `Tab` class |
| `src/features/tabs/models/tab.ts` | Add `groupId` field, include in `toJSON()`, handle on creation |
| `src/features/tabs/controllers/index.ts` | Integrate with `TabGroupController` on close/reorder |
| `src/core/controller/viewController.ts` | Wire `TabGroupRoute`, init `tabGroupController` + `tabGroupOverlayController`, sync groups to renderer |
| `src/features/cacheSystem/index.ts` | Added `"tabGroups"` to `Collection` type and data record |

## 9. Drag & Drop Considerations

The existing drag system in `SideMenu` currently handles reordering within the flat unpinned list. With groups:

1. **Within-group drag**: Same logic as current, scoped to tabs within the same group.
2. **Cross-group drag**: Dragging a tab from group A to group B or to the ungrouped area changes `groupId`.
3. **Drag onto group header**: Adds tab to that group.
4. **Group header reorder**: Drag group headers to reorder groups.

This will require updating the drag state to include `groupId` and checking drop targets for group membership.

## 10. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Close tab that belongs to a group | Remove tabId from group.tabIds; if group becomes empty, auto-delete the group |
| Ungrouped tabs | Tabs without `groupId` render as they do today (no change) |
| All tabs in a group closed | Auto-delete empty group |
| Tab restored from cache | `groupId` is persisted in tab JSON; group must be loaded before tabs reference it |
| Multiple groups with same name | Allowed — groups are identified by `id` (UUID) |
| Drag a pinned tab | Pinned tabs cannot be grouped (enforced at controller level) |
| Collapse + new tab added to group | Group auto-expands to show the new tab |
| Window resize / narrow sidebar | Group headers collapse to minimal view (same container query pattern as pinned group) |
| Hidden group with active tabs | Tabs remain open in browser; group hidden from sidebar; re-accessible via "Group" button + overlay |
| Edit group name/color via overlay | Overlay shows "Edit Group" form with pre-filled values; saves via `RENAME_TAB_GROUP` + `SET_TAB_GROUP_COLOR` |
