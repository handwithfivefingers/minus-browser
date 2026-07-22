import { app, BrowserWindow, Menu, Notification, systemPreferences } from 'electron'
import path from 'node:path'
import log from 'electron-log'
import started from 'electron-squirrel-startup'
import { findbarService } from '../features/findbar/service'
import { CommandController } from './core/controller/commandController'
import { ViewController } from './core/controller/viewController'
import { menuApplication } from './core/services/menu'
import { browserSession, sessionInitPromise } from './core/services/session'
import { createMainWindow, loadAppURL, setupLogging, setupUserAgent, setupWindowCrashHandlers } from './core/window'

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')

Object.assign(console, log.functions)

if (started) app.quit()

Menu.setApplicationMenu(null)

if (process.env.NODE_ENV !== 'development') {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('http', process.execPath, [path.resolve(process.argv[1])])
      app.setAsDefaultProtocolClient('https', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('http')
    app.setAsDefaultProtocolClient('https')
  }
}

let browser: BrowserWindow | null = null
let viewController: ViewController | null = null
let isPersistingBeforeQuit = false
let didRunBeforeQuit = false
if (process.env.NODE_ENV !== 'development') {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
  }
}

async function flushPersistenceOnQuit() {
  if (isPersistingBeforeQuit) return
  isPersistingBeforeQuit = true
  try {
    await viewController?.persist()
  } catch (error) {
    log.error('flushPersistenceOnQuit failed', error)
  }
}

async function createWindow() {
  try {
    if (browser) return
    const win = await createMainWindow({ session: browserSession })
    setupUserAgent(win, browserSession)
    browser = win

    viewController = new ViewController(win)
    findbarService.init(win)
    await viewController.ready()
    if (Notification.isSupported()) {
      new Notification({ title: 'Minus Browser', body: 'Welcome to Minus Browser!' }).show()
    }
    const commandController = new CommandController(viewController)
    menuApplication.rebuild(commandController.menuItems)

    win.webContents.on('did-finish-load', () => viewController?.syncTabsToWindows())
    setupWindowCrashHandlers(win)
    setupLogging()
    loadAppURL(win)
    win.show()
    if (process.env.NODE_ENV === 'development') win.webContents.openDevTools()
  } catch (error) {
    console.error('[ERROR] Create Window Error - ', error)
  }
}

app.on('ready', () => {
  log.initialize()
  app.setAppUserModelId('com.minusbrowser.localdev')
})
app.on('before-quit', async (event) => {
  if (didRunBeforeQuit) return
  didRunBeforeQuit = true
  event.preventDefault()
  await flushPersistenceOnQuit()
  app.quit()
})
app.on('will-quit', flushPersistenceOnQuit)

app.on('render-process-gone', () => app.quit())

// Đối với Windows và Linux (Nhận url thông qua tham số argv)

app.on('second-instance', (event, commandLine) => {
  if (browser) {
    if (browser.isMinimized()) browser.restore()
    browser.focus()
  }
  // Tìm URL trong mảng tham số hệ điều hành truyền vào
  const url = commandLine.pop()
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    // mainWindow.loadURL(url); // Mở link đó lên trình duyệt của bạn
    viewController?.createTab({ url })
  }
})

app.whenReady().then(async () => {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  if (process.platform === 'darwin') {
    for (const media of ['microphone', 'camera'] as const) {
      try {
        const status = systemPreferences.getMediaAccessStatus(media)
        if (status === 'not-determined') {
          const granted = await systemPreferences.askForMediaAccess(media)
          if (granted) {
            console.log(`${media} access granted!`)
          }
        } else if (status === 'denied') {
          console.warn(
            `${media} access denied at OS level — go to System Settings → Privacy & Security → ${media === 'microphone' ? 'Microphone' : 'Camera'} to enable`
          )
        }
      } catch (err) {
        console.error(`Failed to request ${media} access:`, err)
      }
    }
  }
  await sessionInitPromise
  await createWindow()
  const url = process.argv.pop()
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    viewController?.createTab({ url })
  }
  if (menuApplication?.menu) Menu.setApplicationMenu(menuApplication?.menu)
})

// Đối với macOS (Nhận url thông qua sự kiện open-url)
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (browser && viewController) {
    viewController?.createTab({ url })
  } else {
    app.whenReady().then(() => viewController?.createTab({ url }))
  }
})
