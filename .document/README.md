# Project Documentation

This document provides an overview of the project structure, configuration, and usage guidelines.

## Directory Structure

- `.document/` - Documentation files.
- `src/` - Source code.
  - `main/` - Main process entry and core infrastructure.
    - `index.ts` - App bootstrap entry point.
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
    - `capture/` - Page capture feature.
    - `findbar/` - In-page find bar.
    - `injection/` - Injection overlay apps (translate, userscript, vault).
    - `notification/` - Web notification handling.
    - `password/` - Password management (legacy).
    - `permission/` - Site permission prompts.
    - `search/` - In-page search controller and plugin.
    - `spotlight/` - Spotlight overlay for tab search and actions.
    - `sub-window/` - Sub-window IPC handlers and service.
    - `tabGroup/` - Tab group management.
    - `tabPluginManager/` - Plugin system for tab lifecycle hooks.
    - `tabs/` - Tab model, controllers, and services.
    - `translate/` - Translation feature (popup, overlay, plugin).
    - `userscript/` - User script manager and injection.
    - `vault/` - Password vault (CRUD, autofill, credential picker).
    - `youtubeEmbed/` - YouTube embed overlay plugin.
  - `preload/` - Electron preload scripts.
    - `preload.ts` - Main preload script.
  - `renderer/` - Renderer process code.
    - `main-window/src/` - React-based main window UI (sidebar, tabs, settings, AI sider).
    - `sub-window/` - Sub-window overlay renderer (spotlight, vault, translate, userscript, tabgroup).
  - `shared/` - Shared constants, types, and utilities.
  - `global.d.ts` - Global type declarations.
  - `interface.d.ts` - Electron IPC API types.
- `tests/` - Test files.

### Architecture Notes

- **`src/main/core/`** has zero knowledge of individual features — it provides foundational infrastructure (storage, session, window creation) and the application orchestrator (`viewController.ts`) that wires features together.
- **`features/`** are independent modules. They import from `~/main/core/*` for infrastructure but never from other features.
- **`src/main/index.ts`** is a thin bootstrap: it initializes core services, creates the window, and passes control to `ViewController`.

### Features

#### Tab Management

- **Pin Tab** — Each tab has a pin button (hover to reveal). Clicking pins/unpins the tab. Pinned tabs are grouped at the top with a distinct background and "Pinned" label, visually separated from unpinned tabs.
- **Tab Drag & Drop** — Unpinned tabs can be reordered by dragging the grip handle (appears on hover). A blue drop line indicator shows where the tab will land. Touch support via long-press + drag.
  - IPC: `TOGGLE_PIN_TAB` (invoke) / `REORDER_TABS` (emit)
  - Main process: `TabController.togglePinTab()` / `TabController.reorderTabs()`
  - Renderer: `SideMenu` with custom pointer-event-based drag system, `TabItem` with pin button and drag handle
