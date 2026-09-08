import { app, session } from 'electron'

let hasCustomUserAgent = false

function getChromeVersion(): string {
  return process.versions.chrome || '150.0.0.0'
}

function getChromiumMajor(): string {
  return getChromeVersion().split('.')[0] || '150'
}

function normalizeChromeVersion(ua: string): string {
  // Mirror Min (https://github.com/minbrowser/min/blob/master/main/UASwitcher.js):
  // replace full Chrome version (e.g. 150.0.7871.46) with major.0.0.0 (150.0.0.0) to avoid fingerprinting and Twitch version checks
  const chromeVersion = getChromeVersion()
  const normalized = chromeVersion
    .split('.')
    .map((v, idx) => (idx === 0 ? v : '0'))
    .join('.')
  if (ua.includes(chromeVersion)) return ua.replace(chromeVersion, normalized)
  return ua.replace(/Chrome\/\d+\.\d+\.\d+\.\d+/g, `Chrome/${normalized}`)
}

function getFirefoxUA(): string {
  const rootUAs: Record<string, string> = {
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:FXVERSION.0) Gecko/20100101 Firefox/FXVERSION.0',
    windows: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:FXVERSION.0) Gecko/20100101 Firefox/FXVERSION.0',
    linux: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:FXVERSION.0) Gecko/20100101 Firefox/FXVERSION.0',
  }

  let rootUA: string
  if (process.platform === 'win32') {
    rootUA = rootUAs.windows
  } else if (process.platform === 'darwin') {
    rootUA = rootUAs.mac
  } else {
    rootUA = rootUAs.linux
  }

  const fxVersion = 91 + Math.floor((Date.now() - 1628553600000) / (4.1 * 7 * 24 * 60 * 60 * 1000))

  return rootUA.replace(/FXVERSION/g, String(fxVersion))
}

function applyClientHints(headers: Record<string, string>): void {
  // Mirror Min's UASwitcher but use correct Chrome 3-brand format (Chromium + Google Chrome + Not.A/Brand)
  // Kasada (x-kpsdk) validates Sec-CH-UA consistency; Min's 2-brand header is tolerated but 3-brand is more Chrome-accurate
  const chromiumMajor = getChromiumMajor()
  headers['SEC-CH-UA'] = `"Chromium";v="${chromiumMajor}", "Google Chrome";v="${chromiumMajor}", "Not.A/Brand";v="99"`
  headers['SEC-CH-UA-MOBILE'] = '?0'
  // Ensure platform header matches UA (curl shows macOS on Mac, Windows on Win, Linux on Linux)
  const platformMap: Record<string, string> = { darwin: '"macOS"', win32: '"Windows"', linux: '"Linux"' }
  const expectedPlatform = platformMap[process.platform] || '"Linux"'
  // Only set if not already correct or contains Electron
  const currentPlatform =
    headers['Sec-CH-UA-Platform'] || headers['sec-ch-ua-platform'] || headers['SEC-CH-UA-PLATFORM']
  if (!currentPlatform || currentPlatform.includes('Electron') || currentPlatform.includes('MinusBrowser')) {
    headers['Sec-CH-UA-Platform'] = expectedPlatform
  }
  // Also clean any existing headers that might contain Electron/MinusBrowser in other casing
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase()
    if (lower === 'sec-ch-ua-full-version-list' || lower === 'sec-ch-ua-platform' || lower === 'sec-ch-ua-arch') {
      const val = headers[key]
      if (val && (val.includes('Electron') || val.includes('MinusBrowser'))) {
        delete headers[key]
      }
    }
  }
}

function enableGoogleUASwitcher(ses: Electron.Session): void {
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!hasCustomUserAgent && details.url.includes('accounts.google.com')) {
      const urlObj = new URL(details.url)
      if (urlObj.hostname === 'accounts.google.com') {
        details.requestHeaders['User-Agent'] = getFirefoxUA()
      }
    }

    if (!hasCustomUserAgent) {
      applyClientHints(details.requestHeaders as Record<string, string>)
      // Defense-in-depth: ensure User-Agent header has no Electron/MinusBrowser and normalized Chrome version
      const ua = details.requestHeaders['User-Agent'] as string | undefined
      if (ua && (ua.includes('Electron') || ua.includes('MinusBrowser') || ua.includes(process.versions.chrome))) {
        details.requestHeaders['User-Agent'] = normalizeChromeVersion(
          ua
            .replace(/\s*MinusBrowser\/\S+/g, '')
            .replace(/\s*Electron\/\S+/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        )
      }
    }

    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })
}

export function setupUserAgent(ses: Electron.Session): void {
  enableGoogleUASwitcher(ses)
}

export function initializeUserAgent(): void {
  const defaultUserAgent = app.userAgentFallback
  let newUserAgent: string

  if (process.env.MINUS_CUSTOM_USER_AGENT) {
    newUserAgent = process.env.MINUS_CUSTOM_USER_AGENT
    hasCustomUserAgent = true
  } else {
    newUserAgent = normalizeChromeVersion(
      defaultUserAgent
        .replace(/\s*MinusBrowser\/\S+/g, '')
        .replace(/\s*Electron\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
  }

  app.userAgentFallback = newUserAgent

  app.once('ready', () => {
    enableGoogleUASwitcher(session.defaultSession)
  })

  app.on('session-created', enableGoogleUASwitcher)
}
