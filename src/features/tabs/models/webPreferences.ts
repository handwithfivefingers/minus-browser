import { join } from 'node:path'
export const getDefaultViewWebPreferences = (id: string, session: Electron.Session) => {
  return {
    nodeIntegration: false,
    nodeIntegrationInSubFrames: true,
    scrollBounce: true,
    safeDialogs: true,
    safeDialogsMessage: 'Prevent this page from creating additional dialogs',
    preload: join(__dirname, 'notification-preload.js'),
    contextIsolation: true,
    sandbox: false,
    enableRemoteModule: false,
    allowPopups: false,
    enableWebSQL: false,
    minimumFontSize: 6,
    additionalArguments: [`--notification-tab-id=${id}`],
    session, // partition: partition || 'persist:webcontent',
    // match Chrome's default for anti-fingerprinting purposes (Electron defaults to 0)
    // autoplayPolicy: settings.get('enableAutoplay') ? 'no-user-gesture-required' : 'user-gesture-required',
    // javascript: !settings.get('filtering')?.contentTypes?.includes('script'),
  }
  // webPreferences: {
  //   nodeIntegration: false,
  //   contextIsolation: true,
  //   session: this.minusSession,
  //   preload: path.join(__dirname, 'notification-preload.js'),
  //   sandbox: true,
  //   minimumFontSize: 6,
  //   enableWebSQL: false,
  //   additionalArguments: [`--notification-tab-id=${this.id}`],
  // },
}
