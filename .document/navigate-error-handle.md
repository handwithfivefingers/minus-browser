# Tab Navigation Error Handling

## Overview
Catch navigation failures (network errors, DNS failures, HTTP 4xx/5xx, connection issues, cert errors, timeouts) and show user-friendly error pages within the tab.

## Error Detection Points

| Scenario | Event | Source |
|---|---|---|
| DNS/Network/Connection/TLS errors | `webContents.did-fail-load` | `tab.ts:230` |
| HTTP 4xx/5xx | `webContents.did-navigate` — check `httpResponseCode >= 400` | `tab.ts:235` |
| Certificate warnings | `webContents.certificate-error` (optional) | `tab.ts` |

## Files to Modify

### 1. `src/shared/types/tab.d.ts` — Add error types

Add `TabError` interface and extend `ITab`:

```typescript
export interface TabError {
  code: string;              // e.g., "ERR_NAME_NOT_RESOLVED", "HTTP_500"
  description: string;       // Human-readable description
  url: string;               // The URL that failed
  httpResponseCode?: number; // HTTP status code (for 4xx/5xx)
  isCertError?: boolean;
}

// Add to ITab:
// error?: TabError | null;
```

### 2. `src/features/tabs/models/tab.ts` — Listen for navigation errors

In `registerCommonEvent()`, add listeners for:
- `did-fail-load` — network/DNS/connection errors
- Enhance `did-navigate` (existing) — check for HTTP 4xx/5xx via `httpResponseCode`

Create helper method `handleNavigationError(errorCode, errorDescription, url, httpResponseCode?)` that:
1. Categorizes the error into a user-friendly message
2. Sets `this.error` on the tab
3. Sends error info to renderer via `peristInformationToRenderer({ error: tabError })`
4. Loads an error page HTML into the webContents via `data:text/html,` URI

Clear errors on successful navigation (in `did-navigate` for non-error status codes).

**Error Categories:**

| Code Pattern | Title | Example Description |
|---|---|---|
| `ERR_NAME_NOT_RESOLVED` | This site can't be reached | Server IP address could not be found |
| `ERR_CONNECTION_REFUSED` | This site can't be reached | Connection refused |
| `ERR_CONNECTION_TIMED_OUT` | This site can't be reached | Connection timed out |
| `ERR_CONNECTION_RESET` | This site can't be reached | Connection was reset |
| `ERR_INTERNET_DISCONNECTED` | No internet | Your device is offline |
| `ERR_TIMED_OUT` | This site took too long to respond | Server took too long |
| `ERR_CERT_*` | Your connection is not private | Certificate invalid |
| `HTTP_4xx` | This page isn't working | HTTP 404 Not Found |
| `HTTP_5xx` | This page isn't working | HTTP 500 Internal Server Error |

### 3. `src/renderer/main-window/src/interfaces/tab.d.ts` — Mirror error field

Add to renderer-side `Tab` class:
```typescript
error?: { code: string; description: string; url: string; httpResponseCode?: number; isCertError?: boolean } | null;
```

### 4. `src/renderer/main-window/src/pages/customApp/index.tsx` — Show error components

In `CustomApp`:
- When `tab?.error` is truthy, render `<TabErrorPage>` instead of `<WebViewInstance>`
- On retry: clear error in store → call `handleSearch(url)` to re-navigate
- Error updates arrive via existing `subscribeTab` / `TAB_INFORMATION_UPDATED` mechanism

### 5. NEW: `src/renderer/main-window/src/components/tab/TabErrorPage.tsx`

Create React component:
- Error icon (from `@tabler/icons-react`, e.g. `IconPlayerX`, `IconCloudOff`)
- Error title per category
- Error description + HTTP status code badge
- Failed URL display
- "Retry" button + "Go to Home" fallback
- Styled with Tailwind to match app theme

## Flow Diagram

```
loadURL(url)
  ├─ did-navigate (success)
  │    ├─ httpCode >= 400 → set error → load error HTML → notify renderer
  │    └─ httpCode < 400  → clear error → normal page
  ├─ did-fail-load (network failure)
  │    ├─ ERR_ABORTED → ignore
  │    └─ other       → set error → load error HTML → notify renderer
  └─ certificate-error (optional)
       → set cert error → load cert warning HTML → notify renderer
```

## Edge Cases

- **ERR_ABORTED** — Silently ignore (user clicked away mid-load)
- **about:blank** — Skip error handling
- **Hibernated tabs** — Re-check error state on wake
- **Same-page hash navigation** — Ignore (not a real navigation)
- **Certificate errors** — Optional "Proceed anyway" flow (phase 2)

## Retry Flow

| Approach | Mechanism |
|---|---|
| Native (error page) | Button in error HTML navigates to `originalUrl` via `location.href` |
| React (overlay) | Button clears error state → emits `VIEW_CHANGE_URL` IPC |
