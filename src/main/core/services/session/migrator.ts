import { app } from 'electron'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const STORE_FILES = [
  'userData.json',
  'interface.json',
  'bookmark.json',
  'history.json',
  'permission.json',
  'userscripts.json',
  'passwordVault.json',
  'translate.json',
]

function getCommonUserDataParents(): string[] {
  const home = os.homedir()
  switch (process.platform) {
    case 'darwin':
      return [path.join(home, 'Library', 'Application Support')]
    case 'win32':
      return [process.env.APPDATA || path.join(home, 'AppData', 'Roaming')]
    case 'linux':
      return [process.env.XDG_CONFIG_HOME || path.join(home, '.config')]
    default:
      return []
  }
}

async function copyFile(src: string, dest: string): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(src, dest)
    return true
  } catch {
    return false
  }
}

async function copyRecursive(src: string, dest: string): Promise<void> {
  const stats = await fs.stat(src).catch(() => null)
  if (!stats) return

  if (stats.isDirectory()) {
    const entries = await fs.readdir(src)
    await fs.mkdir(dest, { recursive: true })
    await Promise.all(entries.map((entry) => copyRecursive(path.join(src, entry), path.join(dest, entry))))
  } else {
    await fs.copyFile(src, dest)
  }
}

function getCurrentElectronVersion(): string {
  return process.versions.electron || '0.0.0'
}

async function findOldUserDataPaths(currentUserData: string): Promise<string[]> {
  const parents = getCommonUserDataParents()
  const found: string[] = []

  for (const parent of parents) {
    const names = ['minusbrowser', 'MinusBrowser', 'com.minusbrowser.localdev', 'Electron']
    for (const name of names) {
      const p = path.join(parent, name)
      if (p === currentUserData) continue
      try {
        await fs.access(p)
        found.push(p)
      } catch {
        console.log('[Migration] Failed to access', p)
      }
    }
  }

  return found
}

// ── Version tracking (written every startup, used to detect upgrades) ─────

export interface VersionInfo {
  appVersion: string
  electronVersion: string
}

const versionFilePath = (userData: string) => path.join(userData, '.app-info')

export async function readVersionInfo(userData: string): Promise<VersionInfo | null> {
  try {
    const raw = await fs.readFile(versionFilePath(userData), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function writeVersionInfo(userData: string): Promise<void> {
  const info: VersionInfo = {
    appVersion: app.getVersion(),
    electronVersion: getCurrentElectronVersion(),
  }
  await fs.writeFile(versionFilePath(userData), JSON.stringify(info, null, 2), 'utf-8')
}

export interface VersionChange {
  /** true when appVersion differs */
  appChanged: boolean
  /** true when Electron major version differs */
  electronMajorChanged: boolean
}

export async function detectVersionChange(userData: string): Promise<VersionChange> {
  const prev = await readVersionInfo(userData)
  if (!prev) {
    return { appChanged: false, electronMajorChanged: false }
  }

  return {
    appChanged: prev.appVersion !== app.getVersion(),
    electronMajorChanged: prev.electronVersion.split('.')[0] !== getCurrentElectronVersion().split('.')[0],
  }
}

// ── userData migration (one-time, copies files from legacy paths) ─────────

async function isMigrationDone(currentUserData: string): Promise<boolean> {
  try {
    await fs.access(path.join(currentUserData, '.migrated'))
    return true
  } catch {
    return false
  }
}

async function readOldElectronVersion(dataDir: string): Promise<string | null> {
  // Read from old .last-electron-version (pre-Phase2)
  try {
    return await fs.readFile(path.join(dataDir, '.last-electron-version'), 'utf-8')
  } catch {
    return null
  }
}

async function writeMigrationSentinel(
  currentUserData: string,
  sources: string[],
  partitionsMigrated: boolean
): Promise<void> {
  await fs.writeFile(
    path.join(currentUserData, '.migrated'),
    JSON.stringify(
      {
        version: app.getVersion(),
        electronVersion: getCurrentElectronVersion(),
        migratedAt: new Date().toISOString(),
        migratedFrom: sources,
        migratedPartitions: partitionsMigrated,
      },
      null,
      2
    ),
    'utf-8'
  )
}

async function migrateSinglePath(
  oldPath: string,
  currentUserData: string
): Promise<{ migrated: boolean; partitionsMigrated: boolean }> {
  let migrated = false
  let partitionsMigrated = false

  for (const filename of STORE_FILES) {
    const src = path.join(oldPath, filename)
    const dest = path.join(currentUserData, filename)
    const ok = await copyFile(src, dest)
    if (ok) migrated = true
  }

  const oldPartitions = path.join(oldPath, 'Partitions')
  try {
    await fs.access(oldPartitions)
    const oldElectronVer = await readOldElectronVersion(oldPath)
    const currentMajor = getCurrentElectronVersion().split('.')[0]
    const oldMajor = oldElectronVer?.split('.')[0]

    if (oldMajor && oldMajor === currentMajor) {
      const dest = path.join(currentUserData, 'Partitions')
      await copyRecursive(oldPartitions, dest)
      partitionsMigrated = true
      migrated = true
    } else {
      console.error(
        `[Migration] Skipping Partitions/ from ${oldPath} — Electron major version changed (${oldMajor ?? 'unknown'} → ${currentMajor})`
      )
    }
  } catch {
    console.error(`[Migration] Skipping Partitions/ from ${oldPath} — not found`)
  }

  return { migrated, partitionsMigrated }
}

export async function migrateUserData(): Promise<boolean> {
  const currentUserData = app.getPath('userData')

  if (await isMigrationDone(currentUserData)) {
    return false
  }

  const oldPaths = await findOldUserDataPaths(currentUserData)
  if (oldPaths.length === 0) {
    await writeMigrationSentinel(currentUserData, [], false)
    return false
  }

  const migratedSources: string[] = []
  let anyPartitionsMigrated = false

  for (const oldPath of oldPaths) {
    const { migrated, partitionsMigrated } = await migrateSinglePath(oldPath, currentUserData)
    if (migrated) {
      migratedSources.push(oldPath)
      console.error(`[Migration] Migrated data from ${oldPath}`)
    }
    if (partitionsMigrated) anyPartitionsMigrated = true
  }

  await writeMigrationSentinel(currentUserData, migratedSources, anyPartitionsMigrated)

  if (migratedSources.length > 0) {
    console.error(`[Migration] Complete — migrated from ${migratedSources.length} old userData path(s)`)
  }

  return anyPartitionsMigrated
}

// ── Legacy session.json migration (backward compat from Phase1) ──────────

export async function needsLegacyCookieMigration(currentUserData: string): Promise<boolean> {
  const sessionJson = path.join(currentUserData, 'session.json')
  // Electron maps persist:minus-browser → Partitions/minus-browser on disk
  const partitionDir = path.join(currentUserData, 'Partitions', 'minus-browser')

  try {
    await fs.access(sessionJson)
    try {
      await fs.access(partitionDir)
      return false
    } catch {
      return true
    }
  } catch {
    return false
  }
}

export async function readLegacySessionCookies(currentUserData: string): Promise<Record<string, any>[] | null> {
  try {
    const raw = await fs.readFile(path.join(currentUserData, 'session.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    // @ts-ignore
    return Array.isArray(parsed) ? parsed : Object.values(parsed).flat()
  } catch {
    return null
  }
}

export async function removeLegacySessionFile(currentUserData: string): Promise<void> {
  try {
    await fs.unlink(path.join(currentUserData, 'session.json'))
    console.error('[Migration] Removed legacy session.json')
  } catch {
    console.log('[Migration] Failed to remove legacy session.json')
  }
}
