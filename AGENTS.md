# MinusBrowser — Agent Guide

## Quick start

```bash
npm install        # install deps
npm start          # dev (uses cross-env NODE_OPTIONS=--no-deprecation)
npm run build:mac  # package for macOS (PLATFORM=MAC)
npm run build:win  # package for Windows (PLATFORM=WIN)
npm run lint       # ESLint (.ts,.tsx)
```

No `typecheck` script exists — only `lint` and `test` are wired. Tests (Vitest) live under `src/**/__tests__/`; run with `npm test` (or `npm run test:watch` for watch mode).

## Architecture

### Entry points (Electron Forge Vite plugin — `forge.config.ts`)

- **Main process**: `src/main/index.ts` → built by `vite.main.config.ts`
- **Primary preload**: `src/preload/preload.ts` → `vite.preload.config.ts`
- **Feature preloads** (each its own Vite config, output lands in `.vite/build/` with `emptyOutDir: false`):
  - adblocker, findbar, notification (x2), media, spoof, userscript
- **Renderer 1 (main_window)**: root `src/renderer/main-window/index.html`, built by `vite.renderer.config.ts` → `.vite/renderer/main_window`
- **Renderer 2 (sub_window)**: root `src/renderer/sub-window/index.html`, built by `vite.sub-window.renderer.config.ts` → `.vite/renderer/sub_window`

### Source layout

- `src/main/core/` — controllers, IPC handlers, services, window management, stores
- `src/renderer/main-window/src/` — main React UI (hash router, Tailwind, Zustand)
- `src/renderer/sub-window/` — overlays (spotlight, capture, permissions, translate, userscript, vault, tab context)
- `src/features/` — feature modules; many export their own preload scripts
- `src/shared/` — constants (IPC channels), types, utils, stores

### IPC pattern

Renderer talks to main via `window.api.INVOKE` / `window.api.EMIT` / `window.api.LISTENER` (typed in `src/interface.d.ts`). Channels are centralized in `src/shared/constants/ipc.ts`.

## Testing (Vitest)

30 test files, 222 tests total. Run with `npm test` (single run) or `npm run test:watch`.

- **Main process tests** use `// @vitest-environment node` pragma
- **Renderer tests** default to jsdom (configured in `vitest.config.ts`)
- **Global setup** (`src/test-setup.ts`) mocks `electron` and `electron-log` for all environments; `window.api` is set conditionally in jsdom only
- **Component tests** re-render into same DOM; use `beforeEach(cleanup)` from `@testing-library/react` to isolate each test
- **Path alias** `~` → `./src` is configured in vitest config (resolve.alias) — works in both `import` and Vite transforms
- Two known source code limitations around IPv6 validation (`isValidIPv6` is simplified, doesn't match all compressed forms) and encryption (`secretKey` is only 6 bytes, but `aes-256-cbc` needs 32) — tests accommodate these

## Key quirks

- **Path alias**: `~` maps to `./src` (configured in every Vite config + tsconfig paths). Always use `~/...` for imports from anywhere.
- **TypeScript**: pinned to `~4.5.4`. No `tsc` — only ESLint for static checking.
- **Tailwind**: v4, loaded via `@tailwindcss/vite` plugin.
- **React Router**: v7 with `createHashRouter` (hash-based routing).
- **Root `index.html`** is stale — the real renderer HTML files live in `src/renderer/main-window/` and `src/renderer/sub-window/`.
- **Cookie encryption** is explicitly disabled via Electron Fuses (avoids breakage across dev rebuilds).
- **Renderer Vite config** uses `envPrefix: ["VITE_", "GROQ_AI_"]` — environment variables with these prefixes are available in renderer code.
- **Preload configs** that are empty `{}` (adb, media, notification, notification-view) inherit Vite defaults; the working configs (browser-spoof, findbar) set explicit `entry`, `formats: ["cjs"]`, `external: ["electron"]`.
- **Dev-only behavior**: single-instance lock and default protocol client registration are skipped in development (`NODE_ENV !== "development"`).
- **Signing**: local dev builds use ad-hoc signing identity `LocalMinusBrowser`. Entitlements in `entitlements.mac.plist` allow JIT, unsigned library loading, and unsigned executable memory.

## CI

GitHub Actions builds for `macos-latest` and `windows-latest` on `v*` tags. No test/lint step in CI — only `npm run make`.
