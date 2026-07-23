import { execSync } from 'node:child_process'

const APP_NAME = 'MinusBrowser'
const APP_ID = 'MinusBrowser'

function regAdd(key: string): void {
  execSync(`REG ADD "${key}" /F`, { stdio: 'pipe' })
}

function regSet(key: string, valueName: string, data: string): void {
  execSync(`REG ADD "${key}" /V "${valueName}" /D "${data}" /F`, { stdio: 'pipe' })
}

function regSetDefault(key: string, data: string): void {
  execSync(`REG ADD "${key}" /VE /D "${data}" /F`, { stdio: 'pipe' })
}

function regDeleteKey(key: string): void {
  try {
    execSync(`REG DELETE "${key}" /F`, { stdio: 'pipe' })
  } catch {
    // key may not exist
  }
}

function regDeleteValue(key: string, valueName: string): void {
  try {
    execSync(`REG DELETE "${key}" /V "${valueName}" /F`, { stdio: 'pipe' })
  } catch {
    // value may not exist
  }
}

export function registerAsWindowsBrowser(): void {
  if (process.platform !== 'win32') return

  try {
    const appPath = process.execPath
    const capabilitiesKey = `HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities`

    regAdd(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}`)
    regSetDefault(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}`, APP_NAME)

    regAdd(capabilitiesKey)
    regSet(capabilitiesKey, 'ApplicationName', APP_NAME)
    regSet(capabilitiesKey, 'ApplicationDescription', `${APP_NAME} - Lightweight, cross-platform browser`)

    regAdd(`${capabilitiesKey}\\URLAssociations`)
    regSet(`${capabilitiesKey}\\URLAssociations`, 'http', `${APP_ID}.URL.http`)
    regSet(`${capabilitiesKey}\\URLAssociations`, 'https', `${APP_ID}.URL.https`)

    regAdd(`HKCU\\Software\\Classes\\${APP_ID}.URL.http`)
    regSetDefault(`HKCU\\Software\\Classes\\${APP_ID}.URL.http`, 'HTTP URL')
    regSet(`HKCU\\Software\\Classes\\${APP_ID}.URL.http`, 'URL Protocol', '')
    regAdd(`HKCU\\Software\\Classes\\${APP_ID}.URL.http\\shell\\open\\command`)
    regSetDefault(`HKCU\\Software\\Classes\\${APP_ID}.URL.http\\shell\\open\\command`, `"${appPath}" "%1"`)

    regAdd(`HKCU\\Software\\Classes\\${APP_ID}.URL.https`)
    regSetDefault(`HKCU\\Software\\Classes\\${APP_ID}.URL.https`, 'HTTPS URL')
    regSet(`HKCU\\Software\\Classes\\${APP_ID}.URL.https`, 'URL Protocol', '')
    regAdd(`HKCU\\Software\\Classes\\${APP_ID}.URL.https\\shell\\open\\command`)
    regSetDefault(`HKCU\\Software\\Classes\\${APP_ID}.URL.https\\shell\\open\\command`, `"${appPath}" "%1"`)

    regSet(
      `HKCU\\Software\\RegisteredApplications`,
      APP_ID,
      `Software\\Clients\\StartMenuInternet\\${APP_ID}\\Capabilities`
    )
  } catch (error) {
    console.error('Failed to register as Windows browser:', error)
  }
}

export function unregisterAsWindowsBrowser(): void {
  if (process.platform !== 'win32') return

  try {
    regDeleteKey(`HKCU\\Software\\Clients\\StartMenuInternet\\${APP_ID}`)
    regDeleteKey(`HKCU\\Software\\Classes\\${APP_ID}.URL.http`)
    regDeleteKey(`HKCU\\Software\\Classes\\${APP_ID}.URL.https`)
    regDeleteValue(`HKCU\\Software\\RegisteredApplications`, APP_ID)
  } catch (error) {
    console.error('Failed to unregister Windows browser:', error)
  }
}
