- [x] Home clock tight loop — src/renderer/main-window/src/pages/home/index.tsx:38 calls setInterval() with no delay (defaults to 0ms), so toLocaleTimeString() runs continuously. Add , 1000.
- [x] Tab store mutation bug — useTabStore.tsx:11-27 mutates state.tabs[index] in place, so the array reference never changes and subscribers won't re-render. The 1-second polling loop in pages/layout.tsx:36-42 exists to work around it. Fix the store (return a new array) and the poll can go.
- [x] Chat model selector is cosmetic — ChatMode.tsx:13-21 picks a model, but useAiChat.ts:66 calls chatCompletionStream(history) without options, so it always uses the default. Also temperature/maxTokens settings are ignored (aiProvider.ts:78-79,94-95).

2. AI features (biggest opportunity — this is the product differentiator)

- [x] Persist & trim conversation history — chats vanish on reload (useAiSidebarStore not persisted) and useAiChat.ts:53-59 sends all prior messages unbounded. Add context-window trimming + optional persistence.
- [x] Stream + abort for all modes — only Chat streams. Summary/Generate/Explain/QuickActions use non-streaming calls with no stop control.
- [x] Finish the "Describe this image" flow — CaptureMode.tsx:90-97 just switches to chat mode without passing the image; no vision payload is ever built.
- [x] Secure the API key — stored plaintext in localStorage (useAiSettingsStore.ts:56-62). Move it to the main process via safeStorage (same pattern the vault already uses) and expose only through IPC. Also there are two sources of truth (zustand + raw localStorage reads in aiProvider.ts, useAiChat.ts, promptTemplates.ts) — unify them.
- [x] Wire up the dead settings — showFloatingButton is persisted but never read (plugin/index.ts installs the button unconditionally); remove the dead 'short' summarize option.

3. Security hardening (do before release)

- [x] IPC gateway has no sender validation — generic invoke/send handlers (src/main/core/controller/viewController.ts:271-272) are reachable from any page via session preloads (userscript/vault/media/spoof/adblocker all expose ipcRenderer). Privileged targets include vault CRUD and CLEAR_BROWSING_DATA. Add event.senderFrame/URL checks.
- [x] password-form-filled vault poisoning — src/features/vault/controllers/pageIpc.ts:56-78 accepts [domain, username, password] from any frame without verifying the domain matches the sender origin.
- [x] Unrestricted GM_xmlhttpRequest — src/features/userscript/gm-api/network.ts:15-138 is an SSRF-capable main-process fetch with no @connect allowlist or scheme checks.
- [x] URL scheme validation missing — setWindowOpenHandler (tabs/models/permission.ts:32-40), loadURL paths (viewController.ts:398,418), and main/index.ts:172-179 (open-url) accept javascript:/data:/file: URLs. Also tab.ts:328-363 interpolates untrusted URL/description unescaped into the error page HTML.
- [x] Broken legacy AES — src/main/core/utils/encrypt.ts:3 uses 6-byte 'SAMPLE' for aes-256-cbc + a module-level reused IV. It's dead code (tests only) — either fix or delete.
- [x] Vault plaintext fallback — passwordController.ts:91-96,120,130 falls back to base64/plaintext when safeStorage is unavailable, and dev builds write appData/ (with the password store) into the repo tree.

4. Performance & architecture

- [x] CLEAR + re-INSERT whole tabs table on every tab change — src/features/tabs/controllers/index.ts:319-361 is O(n) SQLite churn per add/reorder/close. Switch to upsert/delta writes.
- [x] Markdown re-parsed every stream chunk — MessageBubble.tsx:78-120 re-runs ReactMarkdown+highlight on the full text per token. Debounce or memoize the parse.
- [x] No-op intervals / polls — history page polls every 3s (history/index.tsx:61); GravityStarsBackground runs requestAnimationFrame unconditionally (no visibility gating).
- [x] Dead code to prune — hooks/useTab.ts (no callers), allTestCases (libs/index.ts:112-138), libs/index.ts:1-17 commented block, ~15 @ts-ignore, untyped (window.api.INVOKE as any) calls in Extension.tsx:73-79 / header/index.tsx:76-78.
- [x] Split big components — sub-window/components/spotlight/index.tsx (580 lines), UserScriptSection.tsx (536), sidebar/index.tsx (494), TabContext/index.tsx (444).
