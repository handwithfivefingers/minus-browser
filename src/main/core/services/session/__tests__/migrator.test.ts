// @vitest-environment node
import { app } from 'electron'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { needsLegacyCookieMigration, detectVersionChange, writeVersionInfo, migrateUserData } from '../migrator'

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

function stubCurrentElectron(version: string): void {
  Object.defineProperty(process, 'versions', {
    value: { ...process.versions, electron: version },
    configurable: true,
  })
}

describe('needsLegacyCookieMigration', () => {
  let userData: string

  beforeEach(async () => {
    userData = await makeTempDir('needslegacy-')
  })

  afterEach(async () => {
    await fs.rm(userData, { recursive: true, force: true })
  })

  it('returns false when session.json is missing', async () => {
    expect(await needsLegacyCookieMigration(userData)).toBe(false)
  })

  it('returns false when the native cookie DB already exists', async () => {
    await fs.writeFile(path.join(userData, 'session.json'), '[]', 'utf-8')
    await fs.mkdir(path.join(userData, 'Partitions', 'minus-browser'), { recursive: true })
    await fs.writeFile(path.join(userData, 'Partitions', 'minus-browser', 'Cookies'), 'cookie-db')
    expect(await needsLegacyCookieMigration(userData)).toBe(false)
  })

  it('returns true when the partition dir exists but has no cookie DB yet', async () => {
    await fs.writeFile(path.join(userData, 'session.json'), '[]', 'utf-8')
    // The partition directory is created eagerly by session.fromPartition() /
    // clearStorageData() before this check runs; it must not block the import.
    await fs.mkdir(path.join(userData, 'Partitions', 'minus-browser'), { recursive: true })
    expect(await needsLegacyCookieMigration(userData)).toBe(true)
  })
})

describe('detectVersionChange', () => {
  let userData: string

  beforeEach(async () => {
    userData = await makeTempDir('versionchange-')
    stubCurrentElectron('43.4.0')
    vi.mocked(app.getVersion).mockReturnValue('1.0.0')
  })

  afterEach(async () => {
    await fs.rm(userData, { recursive: true, force: true })
  })

  it('reports no change when .app-info is missing', async () => {
    expect(await detectVersionChange(userData)).toEqual({
      appChanged: false,
      electronMajorChanged: false,
    })
  })

  it('reports no change on identical app and electron versions', async () => {
    await writeVersionInfo(userData)
    expect(await detectVersionChange(userData)).toEqual({
      appChanged: false,
      electronMajorChanged: false,
    })
  })

  it('reports electronMajorChanged when the Electron major differs', async () => {
    await fs.writeFile(
      path.join(userData, '.app-info'),
      JSON.stringify({ appVersion: '1.0.0', electronVersion: '42.2.0' })
    )
    expect(await detectVersionChange(userData)).toEqual({
      appChanged: false,
      electronMajorChanged: true,
    })
  })

  it('reports appChanged when the app version differs', async () => {
    await fs.writeFile(
      path.join(userData, '.app-info'),
      JSON.stringify({ appVersion: '0.9.0', electronVersion: '43.4.0' })
    )
    expect(await detectVersionChange(userData)).toEqual({
      appChanged: true,
      electronMajorChanged: false,
    })
  })
})

describe('migrateUserData', () => {
  let base: string
  let currentUserData: string

  beforeEach(async () => {
    base = await makeTempDir('migrate-')
    currentUserData = path.join(base, 'current')
    await fs.mkdir(currentUserData, { recursive: true })

    stubCurrentElectron('43.4.0')
    vi.spyOn(os, 'homedir').mockReturnValue(base)
    vi.mocked(app.getPath).mockImplementation((name: string) =>
      name === 'userData' ? currentUserData : '/tmp/test-user-data'
    )
    vi.mocked(app.getVersion).mockReturnValue('1.0.0')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await fs.rm(base, { recursive: true, force: true })
  })

  it('copies Partitions across Electron major versions so cookies are not dropped', async () => {
    // Old build ran on Electron 42 under the old userData path.
    const oldUserData = path.join(base, 'Library', 'Application Support', 'minusbrowser')
    await fs.mkdir(oldUserData, { recursive: true })
    await fs.writeFile(path.join(oldUserData, '.last-electron-version'), '42.2.0', 'utf-8')

    const oldPartition = path.join(oldUserData, 'Partitions', 'minus-browser')
    await fs.mkdir(oldPartition, { recursive: true })
    await fs.writeFile(path.join(oldPartition, 'Cookies'), 'cookie-db-bytes')

    const result = await migrateUserData()

    expect(result).toBe(true)
    const copied = await fs.readFile(path.join(currentUserData, 'Partitions', 'minus-browser', 'Cookies'), 'utf-8')
    expect(copied).toBe('cookie-db-bytes')
  })

  it('is a no-op once the migration sentinel exists', async () => {
    await fs.writeFile(path.join(currentUserData, '.migrated'), '{}', 'utf-8')

    const oldUserData = path.join(base, 'Library', 'Application Support', 'minusbrowser')
    await fs.mkdir(path.join(oldUserData, 'Partitions', 'minus-browser'), { recursive: true })
    await fs.writeFile(path.join(oldUserData, 'Partitions', 'minus-browser', 'Cookies'), 'cookie-db-bytes')

    const result = await migrateUserData()

    expect(result).toBe(false)
    await expect(fs.access(path.join(currentUserData, 'Partitions', 'minus-browser', 'Cookies'))).rejects.toThrow()
  })
})
