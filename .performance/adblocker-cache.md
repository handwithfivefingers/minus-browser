# Adblocker Engine Disk Cache

## Problem

`FiltersEngine.fromLists()` in `src/features/adblocker/controllers/index.ts:42-62` fetches filter list metadata + multiple filter lists from GitHub, then compiles them into an engine. This takes **2-3 seconds** on every launch and blocks the startup critical path.

## Constraint

Adblocker must be initialized **before any Tab starts loading** (network requests must be interceptable from the start).

## Solution

Use `FiltersEngine.serialize()` / `FiltersEngine.deserialize()` (confirmed in `@ghostery/adblocker` v2.18.0 type definitions at `engine.d.ts:138,180`) to cache the compiled engine to disk.

### Cache Strategy

| Aspect | Detail |
|--------|--------|
| **Cache key** | SHA-256 hash of sorted `disabledFilters` array |
| **Storage** | `{userData}/adblock-cache/{hash}.bin` (engine) + `{hash}.meta` (metadata) |
| **Invalidation** | 24h TTL (time-based) OR `disabledFilters` change (key mismatch) |
| **Fallback** | On cache miss/stale, do full network fetch + compile + re-cache |

### Implementation

In `load()` method:

1. Compute cache key from `this._disabledFilters`
2. Try reading cache: if meta exists + key matches + age < 24h → `deserialize()` and return
3. On miss: fetch metadata → filter lists → `fromLists()` → `serialize()` → write cache files
4. `registerIPCHandlers()` is called in both paths

### When Settings Change

When user toggles adblock filters in Settings → `disabledFilters` changes → cache key hash changes → cache miss → re-fetch with new filter set → re-cache. This happens via the existing `ViewController.interfaceSave()` → `adblocker.initialize(newDisabledFilters)` flow.

### Impact

- **Cold start (no cache):** ~2-3s (unchanged)
- **Warm start (cached):** ~30-50ms (50-100x faster)
- **Filter change:** ~2-3s (re-fetch, cached going forward)
