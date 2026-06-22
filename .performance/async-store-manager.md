# StoreManager Async Initialization

## Problem

`StoreManager.initialize()` in `src/core/stores/storeManager.ts:57-68` uses synchronous `fs.mkdirSync()` + `fs.existsSync()` + `fs.writeFileSync()` to ensure storage files exist. Called from constructor for every instance — **4+ instances** at startup (ViewController x2, TabController x2), each blocking the event loop.

## Constraint

Migration must complete before Tabs load, but file existence checks don't need to be synchronous.

## Solution

Move I/O out of constructor into a lazy async `ensureFile()` method called from `readFiles()`.

### Changes

1. Remove `initialize()` call from constructor
2. Add `ensureFile()` method using `fs.promises.mkdir` + `fs.promises.access` + `fs.promises.writeFile`
3. Call `ensureFile()` at top of `readFiles()` when needed
4. Replace sync `fs.mkdirSync` in `saveFiles()` with async `fs.promises.mkdir`

### Impact

- Removes ~4 sync blocking I/O calls from startup (~200ms total)
- Event loop stays responsive during file init
