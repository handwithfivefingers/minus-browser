import { vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
    getVersion: vi.fn(() => '1.0.0'),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn(() => true),
    setAsDefaultProtocolClient: vi.fn(),
    relaunch: vi.fn(),
    exit: vi.fn(),
    setAppUserModelId: vi.fn(),
    commandLine: { appendSwitch: vi.fn() },
  },
  BrowserWindow: vi.fn(() => ({
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      openDevTools: vi.fn(),
      reload: vi.fn(),
      getURL: vi.fn(() => 'about:blank'),
      getTitle: vi.fn(() => ''),
      executeJavaScript: vi.fn(),
      loadURL: vi.fn(),
      findInPage: vi.fn(),
      stopFindInPage: vi.fn(),
      isDevToolsOpened: vi.fn(() => false),
      closeDevTools: vi.fn(),
      session: { cookies: { on: vi.fn(), set: vi.fn(), get: vi.fn() } },
    },
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    on: vi.fn(),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    focus: vi.fn(),
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
    setBounds: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null),
  })),
  screen: { getPrimaryDisplay: vi.fn(() => ({ workAreaSize: { width: 1440, height: 900 } })) },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  Menu: {
    buildFromTemplate: vi.fn(() => ({ popup: vi.fn() })),
    setApplicationMenu: vi.fn(),
  },
  MenuItem: vi.fn(),
  Notification: vi.fn(() => ({ show: vi.fn(), on: vi.fn() })),
  clipboard: { writeText: vi.fn(), readText: vi.fn(() => '') },
  nativeTheme: { shouldUseDarkColors: vi.fn(() => false), on: vi.fn() },
  systemPreferences: {
    getMediaAccessStatus: vi.fn(() => 'not-determined'),
    askForMediaAccess: vi.fn(() => Promise.resolve(true)),
  },
  session: {
    fromPartition: vi.fn(() => ({
      cookies: { on: vi.fn(), set: vi.fn(), get: vi.fn() },
      setPreloads: vi.fn(),
      getPreloads: vi.fn(() => []),
      setUserAgent: vi.fn(),
      clearStorageData: vi.fn(),
    })),
  },
  WebContentsView: vi.fn(),
  webContents: { getAllWebContents: vi.fn(() => []) },
  dialog: { showMessageBox: vi.fn() },
  desktopCapturer: { getSources: vi.fn(() => Promise.resolve([])) },
  net: { fetch: vi.fn() },
}))

vi.mock('electron-log', () => ({
  default: {
    functions: {},
    transports: {
      console: { format: '' },
      file: { resolvePathFn: vi.fn() },
    },
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
    log: vi.fn(),
    initialize: vi.fn(),
  },
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
  silly: vi.fn(),
  log: vi.fn(),
  initialize: vi.fn(),
}))

if (typeof window !== 'undefined' && window.Object === Object) {
  Object.defineProperty(window, 'api', {
    value: {
      INVOKE: vi.fn(),
      EMIT: vi.fn(),
      LISTENER: vi.fn(),
    },
    writable: true,
    configurable: true,
  })
}
