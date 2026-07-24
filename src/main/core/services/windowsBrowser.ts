import { execSync } from 'node:child_process'

const APP_NAME = 'MinusBrowser'
const APP_ID = 'MinusBrowser'

function regCreateKey(key: string): void {
  execSync(`REG ADD "${key}" /F`, { stdio: 'pipe' })
}

function regSetString(key: string, valueName: string, data: string): void {
  execSync(`REG ADD "${key}" /V "${valueName}" /D "${data}" /T REG_SZ /F`, { stdio: 'pipe' })
}

function regSetDefault(key: string, data: string): void {
  execSync(`REG ADD "${key}" /VE /D "${data}" /T REG_SZ /F`, { stdio: 'pipe' })
}

function regSetDword(key: string, valueName: string, data: number): void {
  execSync(`REG ADD "${key}" /V "${valueName}" /D "${data}" /T REG_DWORD /F`, { stdio: 'pipe' })
}

function regDeleteKey(key: string): void {
  try {
    execSync(`REG DELETE "${key}" /F`, { stdio: 'pipe' })
  } catch {
    // key may not exist
  }
}

const keysToCreate = [
  `HKCU\\Software\\Classes\\${APP_ID}`,
  `HKCU\\Software\\Classes\\${APP_ID}\\Application`,
  `HKCU\\Software\\Classes\\${APP_ID}\\DefaultIcon`,
  `HKCU\\Software\\Classes\\${APP_ID}\\shell\\open\\command`,
  `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\FileAssociations`,
  `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\StartMenu`,
  `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\URLAssociations`,
  `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\DefaultIcon`,
  `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\InstallInfo`,
  `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\shell\\open\\command`,
]

export function registerAsWindowsBrowser(): void {
  if (process.platform !== 'win32') return

  try {
    const installPath = process.execPath

    for (const key of keysToCreate) {
      regCreateKey(key)
    }

    regSetString(
      `HKCU\\Software\\RegisteredApplications`,
      APP_ID,
      `Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities`
    )

    regSetDefault(`HKCU\\Software\\Classes\\${APP_ID}`, 'MinusBrowser Document')

    regSetString(`HKCU\\Software\\Classes\\${APP_ID}\\Application`, 'ApplicationIcon', `${installPath},0`)
    regSetString(`HKCU\\Software\\Classes\\${APP_ID}\\Application`, 'ApplicationName', APP_NAME)
    regSetString(`HKCU\\Software\\Classes\\${APP_ID}\\Application`, 'AppUserModelId', APP_ID)

    regSetString(`HKCU\\Software\\Classes\\${APP_ID}\\DefaultIcon`, 'default', `${installPath},0`)

    regSetDefault(`HKCU\\Software\\Classes\\${APP_ID}\\shell\\open\\command`, `"${installPath}" "%1"`)

    regSetString(`HKCU\\Software\\Classes\\.htm\\OpenWithProgIds`, APP_ID, '')
    regSetString(`HKCU\\Software\\Classes\\.html\\OpenWithProgIds`, APP_ID, '')

    regSetString(
      `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\FileAssociations`,
      '.htm',
      APP_ID
    )
    regSetString(
      `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\FileAssociations`,
      '.html',
      APP_ID
    )

    regSetString(
      `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\StartMenu`,
      'StartMenuInternet',
      APP_ID
    )

    regSetString(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\URLAssociations`, 'http', APP_ID)
    regSetString(
      `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities\\URLAssociations`,
      'https',
      APP_ID
    )

    regSetString(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\DefaultIcon`, 'default', `${installPath},0`)

    regSetDword(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\InstallInfo`, 'IconsVisible', 1)

    regSetDefault(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\shell\\open\\command`, installPath)
  } catch (error) {
    console.error('Failed to register as Windows browser:', error)
  }
}

const oldProtocolKeys = [
  `HKCU\\Software\\Classes\\${APP_ID}.URL.http`,
  `HKCU\\Software\\Classes\\${APP_ID}.URL.http\\shell\\open\\command`,
  `HKCU\\Software\\Classes\\${APP_ID}.URL.https`,
  `HKCU\\Software\\Classes\\${APP_ID}.URL.https\\shell\\open\\command`,
]

export function migrateWindowsBrowserRegistry(): void {
  if (process.platform !== 'win32') return

  try {
    for (const key of oldProtocolKeys) {
      regDeleteKey(key)
    }
  } catch (error) {
    console.error('Failed to clean old registry keys:', error)
  }

  registerAsWindowsBrowser()
}

export function unregisterAsWindowsBrowser(): void {
  if (process.platform !== 'win32') return

  try {
    regDeleteKey(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}`)
    regDeleteKey(`HKCU\\Software\\Classes\\${APP_ID}`)
    try {
      execSync(`REG DELETE "HKCU\\Software\\Classes\\.htm\\OpenWithProgIds" /V "${APP_ID}" /F`, { stdio: 'pipe' })
    } catch {
      // value may not exist
    }
    try {
      execSync(`REG DELETE "HKCU\\Software\\Classes\\.html\\OpenWithProgIds" /V "${APP_ID}" /F`, { stdio: 'pipe' })
    } catch {
      // value may not exist
    }
    try {
      execSync(`REG DELETE "HKCU\\Software\\RegisteredApplications" /V "${APP_ID}" /F`, { stdio: 'pipe' })
    } catch {
      // value may not exist
    }
  } catch (error) {
    console.error('Failed to unregister Windows browser:', error)
  }
}
