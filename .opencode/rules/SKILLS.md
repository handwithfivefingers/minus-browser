# TypeScript + Electron Agent Rules

## Project Context
You are building a cross-platform desktop application with Electron and TypeScript, with a clear separation between the main process, renderer process, and preload scripts. Security and process isolation are non-negotiable constraints.

## Code Style & Structure
- Enable TypeScript strict mode in all three process directories (main, renderer, preload).
- Use path aliases (`@main/`, `@renderer/`, `@shared/`) configured in `tsconfig.json` paths and bundler aliases.
- Use `interface` for IPC payload types. Define IPC channel names as `const` enum or typed string literals.
- Keep the main process entry point focused on app lifecycle and window management only.
- Organize renderer code as a standard web app: components, hooks, stores, services.

## Project Structure
```
src/
  main/
    index.ts          # App lifecycle, BrowserWindow creation, IPC handler registration
    windows/          # Window factory functions, window manager
    services/         # Main-process services: file system, native APIs, tray
    ipc/              # IPC handler modules grouped by domain
  renderer/
    index.tsx         # React/Vue entry point
    pages/
    components/
    hooks/
    stores/
  preload/
    index.ts          # contextBridge.exposeInMainWorld() only
  shared/
    ipc-channels.ts   # Typed IPC channel constants and payload types
    types.ts          # Types shared across all processes
resources/            # App icons, tray images — outside src/
```

## IPC Communication
- Define all IPC channel names as typed constants in `shared/ipc-channels.ts`. Never use inline string literals.
- Use `ipcMain.handle` / `ipcRenderer.invoke` for request-response patterns — they return a `Promise` with proper error propagation.
- Use `webContents.send` / `ipcRenderer.on` for one-way main-to-renderer push notifications (menu events, system tray actions).
- Expose a typed API object via `contextBridge.exposeInMainWorld('api', { ... })`. Augment the `Window` interface in a `.d.ts` file.
- Validate and sanitize all data received over IPC in the main process before acting on it.
- Keep IPC payloads JSON-serializable. Never pass class instances, functions, or `undefined` values.
- Unregister `ipcRenderer.on` listeners in component cleanup to prevent memory leaks.

## Security
- Set `nodeIntegration: false` and `contextIsolation: true` on every `BrowserWindow`. No exceptions.
- Never expose Node.js or Electron APIs directly to the renderer. Use `contextBridge` exclusively.
- Implement a strict Content Security Policy via `session.defaultSession.webRequest.onHeadersReceived`.
- Disable `webSecurity` only in development builds. Never ship with `webSecurity: false`.
- Validate every URL before `win.loadURL()`. Use an allowlist for external navigations.
- Call `shell.openExternal(url)` only after validating the URL scheme is `https:` or `mailto:`.
- Disable the deprecated `remote` module entirely. It bypasses the process security boundary.
- Set `sandbox: true` on renderer processes that do not require preload script privileges.

## Window Management
- Create windows via a factory function (`createMainWindow()`) that enforces consistent `webPreferences`.
- Persist window bounds (x, y, width, height, isMaximized) to `electron-store`. Restore on next launch.
- Use a `WindowManager` singleton to track all open `BrowserWindow` instances by a string key.
- Listen to `BrowserWindow` `close` event to persist state and release resources before the window is destroyed.
- Build native menus with `Menu.buildFromTemplate`. Rebuild and call `Menu.setApplicationMenu` when app state changes.

## Auto-Updates
- Use `electron-updater` for cross-platform automatic updates. Configure in `electron-builder` config.
- Check for updates on app start with `autoUpdater.checkForUpdatesAndNotify()`.
- Handle update events: `update-available` (notify user), `download-progress` (show progress), `update-downloaded` (prompt restart).
- Allow users to defer updates. Call `autoUpdater.quitAndInstall()` only on explicit user confirmation.
- Code-sign macOS releases (Developer ID + notarization) and Windows releases (EV or standard cert) to avoid OS security warnings.

## Packaging
- Use `electron-builder` for cross-platform packaging: DMG, NSIS installer, AppImage, Snap, deb, rpm.
- Exclude dev dependencies, test files, and source maps from the packaged app using `files` patterns.
- Enable ASAR packaging for source code. Exclude native `.node` modules from ASAR with `asarUnpack`.
- Optimize bundle size: audit renderer bundle with `webpack-bundle-analyzer` or Vite's rollup visualizer.
- Build platform-specific artifacts in CI: macOS on macOS runners, Windows on Windows runners, Linux on Ubuntu.

## Testing
- Test main process services (IPC handlers, file I/O, native APIs) with Vitest. Mock Electron APIs via `vi.mock('electron')`.
- Test renderer components with React Testing Library or the appropriate UI testing library.
- Write IPC integration tests using Playwright's Electron support (`playwright-electron`) for round-trip verification.
- Test security: attempt `nodeIntegration` access from renderer scripts, attempt XSS via custom protocol handlers.
- Run tests in CI on all three target platforms.

## Performance
- Lazy-load renderer routes to minimize time-to-first-paint on app startup.
- Move CPU-intensive operations (image processing, data parsing) to `worker_threads` or `utilityProcess`.
- Profile the renderer with Chrome DevTools. Profile the main process with Node.js `--inspect` + Chrome DevTools.
- Watch for IPC listener leaks — verify all `ipcRenderer.on` calls have corresponding removal in cleanup.
- Use `requestIdleCallback` in the renderer for non-critical background tasks.
