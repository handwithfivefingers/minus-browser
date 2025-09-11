# minus-browser


# [!Important]
```
@ghostery/adblocker-electron error after build. (Cannot found module @ghostery/adblocker-electron-preload)

- Copy `node_modules\@ghostery\adblocker-electron-preload\dist\index.js` into `src/adb-preload.ts`
- Add `vite.adb-preload.config`
- In `node_modules\@ghostery\adblocker-electron\dist\esm\index.js`:
- Replace PRELOAD_PATH to const PRELOAD_PATH = path.join(__dirname, "/adb-preload.js")

```

### IPC - Using Electron Tab Management
- Snapshot 1: 625 MB 
- Snapshot 2 525 Mb


###  IPC - Using React Tab Management
- Snapshot 1: 590 Mb
- Snapshot 2: 580 Mb