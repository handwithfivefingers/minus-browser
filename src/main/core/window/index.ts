import { app, BrowserWindow, screen } from 'electron'
import path from 'node:path'

import log from 'electron-log'

const preloadPath = path.join(__dirname, 'preload.js')

export interface CreateWindowOptions {
  session?: Electron.Session
}

export async function createMainWindow(options: CreateWindowOptions = {}): Promise<BrowserWindow> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const browserOption = {
    width,
    height,
    show: false,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: preloadPath,
      ...(options.session ? { session: options.session } : {}),
    },
  }
  const browser = new BrowserWindow(browserOption)

  return browser
}

export function loadAppURL(browser: BrowserWindow) {
  // @ts-ignore
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // @ts-ignore
    browser.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    // @ts-ignore
    browser.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }
}

function buildUserAgent(): string {
  const chromeVersion = process.versions.chrome
  // Minus/${app.getVersion()}
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
}

export function setupUserAgent(browser: BrowserWindow, session: Electron.Session) {
  const userAgent = buildUserAgent()
  session.setUserAgent(userAgent)
}

export function setupWindowCrashHandlers(browser: BrowserWindow) {
  browser.webContents?.on('render-process-gone', function (event, detailed) {
    log.error('!crashed, reason: ' + detailed.reason + ', exitCode = ' + detailed.exitCode)
    if (detailed.reason == 'crashed') {
      browser.webContents?.reload()
    } else {
      app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })
      app.exit(0)
    }
  })

  browser.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })
}

export function setupLogging() {
  log.transports.console.format = '[LOGGER] - {h}:{i}:{s} > {text}'
  log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log')
}
