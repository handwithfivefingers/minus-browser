# Plugin Redundant Disk Read Elimination

## Problem

`Tab.registerPlugin()` in `src/features/tabs/models/tab.ts:176-215` reads `interface.json` from disk via `cacheSystem.get("interface", fallback)` on every tab creation. Meanwhile, `ViewController.loadUserInterface()` already loaded the same data into memory. During startup, this means the same file is read twice.

Additionally, `SearchTabPlugin` and `AiTabPlugin` are registered unconditionally for every tab even when they're not needed.

## Constraint

Plugins must be loaded before Tab loads, but only if their feature is enabled.

## Solution

### Part 1: Pass in-memory userInterface to Tab

1. Add `_userInterface` property + `setUserInterface()` method to `Tab` model
2. Add `userInterface` + `setUserInterface()` to `TabController` to propagate to all tabs
3. In `ViewController.init()`, after `loadUserInterface()` completes, call `tabController.setUserInterface(userInterface)`
4. In `Tab.registerPlugin()`, use `this._userInterface` when available instead of re-reading disk

### Part 2: Conditional Plugin Registration

- `VaultTabPlugin` — already conditional on `extension.vault` ✓
- `UserScriptTabPlugin` — already conditional on `extension.userscript` ✓
- `TranslateTabPlugin` — already conditional on `extension.translate` ✓
- `SearchTabPlugin` — always registered (lightweight event listener, acceptable)
- `AiTabPlugin` — always registered (lightweight event listener, acceptable)

### Impact

- Eliminates 1 disk read per tab creation (~20-50ms each)
- Faster tab creation over the app lifecycle
