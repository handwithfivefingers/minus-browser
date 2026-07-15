# Hibernate Feature

Tabs are automatically hibernated (WebContentsView destroyed, memory freed) after a configurable period of inactivity. Hibernated tabs preserve their URL, scroll position, and referrer for seamless restoration on revisit.

## Settings

Navigate to **Settings → Hibernate** to configure:

| Mode   | Timeout | Description                            |
|--------|---------|----------------------------------------|
| Fast   | 15 min  | Aggressive memory saving               |
| Normal | 1 hr    | Balanced (default)                     |
| Slow   | 4 hr    | Tabs stay alive longer                 |
| Custom | User-defined | Set any value between 1-1440 minutes |

Changes take effect on the next hibernation check cycle (every 60 seconds).

## Per-Tab Protection

The **snowflake button** in each tab's header toggles protection from auto-hibernation:

- **Cyan (active)**: Tab is excluded from auto-hibernation. Useful for pinned music players, Google Workspace, long-running forms, etc.
- **Muted (inactive)**: Tab will hibernate normally when idle.

Protection does not prevent manual hibernation via `hibernateTab(id)`.

## Architecture

- `TabController` runs a `setInterval` every 60 seconds checking all non-active, non-pinned, non-protected, non-hibernated, alive tabs whose `timestamp` exceeds the configured threshold.
- The threshold is stored in the user interface config (`interface.json`) under `hibernateMode` and `hibernateCustomMinutes`.
- On app start, `ViewController.loadUserInterface()` propagates the saved mode to `TabController.setHibernateMode()`.
- When settings are saved from the UI, `ViewController.interfaceSave()` updates `TabController` immediately.

## IPC

| Channel                      | Direction | Description                         |
|------------------------------|-----------|-------------------------------------|
| `TOGGLE_PREVENT_HIBERNATE`   | Invoke    | Toggle protection for a tab by ID   |

## Related Files

- `src/features/tabs/controllers/index.ts` — Hibernate timer, mode config, per-tab protection logic
- `src/features/tabs/models/tab.ts` — `preventHibernate` field, `hibernate()`/`wake()` lifecycle
- `src/shared/types/tab.d.ts` — `ITab.preventHibernate`
- `src/shared/types/theme.d.ts` — `IUserInterface.hibernateMode`, `.hibernateCustomMinutes`
- `src/renderer/main-window/src/stores/useMinusTheme.tsx` — Renderer-side hibernate state & save
- `src/renderer/main-window/src/pages/setting/components/HibernateSetting.tsx` — Settings UI
- `src/renderer/main-window/src/components/header.tsx` — Per-tab protection toggle button
