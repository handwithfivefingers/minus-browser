import { join } from 'node:path'
export const getDefaultViewWebPreferences = (id: string, session: Electron.Session): Electron.WebPreferences => {
  return {
    nodeIntegration: false,
    nodeIntegrationInSubFrames: true,
    scrollBounce: true,
    safeDialogs: true,
    safeDialogsMessage: 'Prevent this page from creating additional dialogs',
    preload: join(__dirname, 'notification-preload.js'),
    contextIsolation: true,
    sandbox: true,
    enableWebSQL: false,
    minimumFontSize: 6,
    additionalArguments: [`--notification-tab-id=${id}`],
    session, // partition: partition || 'persist:webcontent',
    autoplayPolicy: 'no-user-gesture-required',
    // enableRemoteModule: false,
    // allowPopups: false,
    // match Chrome's default for anti-fingerprinting purposes (Electron defaults to 0)
    // javascript: !settings.get('filtering')?.contentTypes?.includes('script'),
    webSecurity: true,
  }
}
