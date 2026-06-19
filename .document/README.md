# Project Documentation

This document provides an overview of the project structure, configuration, and usage guidelines.

## Directory Structure

- `.document/` - Documentation files.
- `src/` - Source code.
  - `core/` - Shared infrastructure and application orchestrators.
    - `controller/` - Application controllers.
      - `bookmark/` - Bookmark data persistence.
      - `commandController.ts` - Keyboard shortcut bindings.
      - `context/` - Context menu handler.
      - `history/` - History data persistence.
      - `viewController.ts` - Main app orchestrator: IPC handlers, tab management, feature wiring.
    - `interfaces/` - Shared type definitions (ITab, IPC, IView, etc.).
    - `services/` - Core services.
      - `error.services.ts` - Error dialog handler.
      - `menu/` - Application menu builder.
      - `session/` - Session/cookie manager + user data migrator.
    - `stores/` - File-based JSON storage (StoreManager) and event emitter (MinusEventEmitter).
    - `utils/` - Shared utilities (debounce, encrypt, parser, URL helpers).
    - `window/` - Main window factory.
  - `features/` - Isolated feature modules.
    - `adblocker/` - Ad-blocking engine.
    - `cacheSystem/` - In-memory cache layer.
    - `findbar/` - In-page find bar.
    - `injection/` - Injection overlay apps (translate, userscript, vault).
    - `password/` - Password management (legacy).
    - `search/` - In-page search controller and plugin.
    - `spotlight/` - Spotlight overlay for tab search and actions.
    - `tabPluginManager/` - Plugin system for tab lifecycle hooks.
    - `tabs/` - Tab model, controllers, and services.
    - `translate/` - Translation feature (popup, overlay, plugin).
    - `ui/` - React-based renderer UI (sidebar, tabs, settings, AI sider).
    - `userscript/` - User script manager and injection.
    - `vault/` - Password vault (CRUD, autofill, credential picker).
  - `shared/` - Shared constants, types, and utilities.
  - `global.d.ts` - Global type declarations.
  - `interface.d.ts` - Electron IPC API types.
  - `main.ts` - App bootstrap (147 lines).
  - `preload.ts` - Electron preload script.
  - `renderer.ts` - Renderer entry point.
- `tests/` - Test files.

### Architecture Notes

- **`core/`** has zero knowledge of individual features — it provides foundational infrastructure (storage, session, window creation) and the application orchestrator (`viewController.ts`) that wires features together.
- **`features/`** are independent modules. They import from `~/core/*` for infrastructure but never from other features.
- **`main.ts`** is a thin bootstrap: it initializes core services, creates the window, and passes control to `ViewController`.

### Features

#### Tab Management

- **Pin Tab** — Each tab has a pin button (hover to reveal). Clicking pins/unpins the tab. Pinned tabs are grouped at the top with a distinct background and "Pinned" label, visually separated from unpinned tabs.
- **Tab Drag & Drop** — Unpinned tabs can be reordered by dragging the grip handle (appears on hover). A blue drop line indicator shows where the tab will land. Touch support via long-press + drag.
  - IPC: `TOGGLE_PIN_TAB` (invoke) / `REORDER_TABS` (emit)
  - Main process: `TabController.togglePinTab()` / `TabController.reorderTabs()`
  - Renderer: `SideMenu` with custom pointer-event-based drag system, `TabItem` with pin button and drag handle
