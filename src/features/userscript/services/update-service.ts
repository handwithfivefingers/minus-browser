import { Notification } from 'electron'

import { userScriptController } from '../controllers'
import { parseUserScriptMetadata } from '../parser'

interface UpdateCheckResult {
  scriptId: string
  scriptName: string
  currentVersion: string
  remoteVersion: string
  downloadURL: string
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let checkTimer: ReturnType<typeof setInterval> | null = null

function parseVersion(version: string | undefined | null): number[] {
  if (!version) return [0]
  return version.split('.').map((s) => {
    const n = parseInt(s, 10)
    return isNaN(n) ? 0 : n
  })
}

function isNewerVersion(current: string, remote: string): boolean {
  const curParts = parseVersion(current)
  const remParts = parseVersion(remote)
  const maxLen = Math.max(curParts.length, remParts.length)
  for (let i = 0; i < maxLen; i++) {
    const c = curParts[i] || 0
    const r = remParts[i] || 0
    if (r > c) return true
    if (r < c) return false
  }
  return false
}

export async function checkForUpdates(): Promise<UpdateCheckResult[]> {
  const scripts = userScriptController.listScripts()
  const results: UpdateCheckResult[] = []

  for (const script of scripts) {
    if (script.builtIn || !script.enabled) continue
    const meta = parseUserScriptMetadata(script.source)
    if (!meta?.updateURL) continue

    try {
      const response = await fetch(meta.updateURL)
      const remoteSource = await response.text()
      const remoteMeta = parseUserScriptMetadata(remoteSource)

      if (!remoteMeta?.version) continue

      const currentVer = meta.version || '0.0.0'
      const remoteVer = remoteMeta.version

      if (isNewerVersion(currentVer, remoteVer)) {
        const downloadURL = meta.downloadURL || meta.updateURL
        results.push({
          scriptId: script.id,
          scriptName: script.name,
          currentVersion: currentVer,
          remoteVersion: remoteVer,
          downloadURL,
        })
      }
    } catch (error) {
      console.error(`[UserScript Update] Failed to check ${script.name}:`, error)
    }
  }

  return results
}

export async function applyUpdate(downloadURL: string): Promise<string | null> {
  try {
    const response = await fetch(downloadURL)
    const source = await response.text()
    const meta = parseUserScriptMetadata(source)
    if (!meta) return null

    await userScriptController.saveScript({
      id: '',
      name: meta.name,
      source,
      matches: meta.matches,
      excludes: meta.excludes,
      runAt: meta.runAt,
      enabled: true,
    } as any)

    return meta.name
  } catch (error) {
    console.error('[UserScript Update] Download failed:', error)
    return null
  }
}

export function startUpdateChecker(): void {
  if (checkTimer) return

  checkTimer = setInterval(async () => {
    const updates = await checkForUpdates()
    for (const update of updates) {
      const notif = new Notification({
        title: 'UserScript Update Available',
        body: `${update.scriptName}: ${update.currentVersion} → ${update.remoteVersion}`,
      })
      notif.on('click', async () => {
        const name = await applyUpdate(update.downloadURL)
        if (name) {
          new Notification({
            title: 'UserScript Updated',
            body: `${name} has been updated to ${update.remoteVersion}`,
          }).show()
        }
      })
      notif.show()
    }
  }, CHECK_INTERVAL_MS)

  checkForUpdates().catch(() => {
    console.error('[UserScript Update] Failed to check for updates')
  })
}

export function stopUpdateChecker(): void {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}
