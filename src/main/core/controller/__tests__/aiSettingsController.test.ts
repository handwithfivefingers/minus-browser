import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSafeStorage, mockFs } = vi.hoisted(() => {
  const fsMock = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
  return {
    mockSafeStorage: {
      isEncryptionAvailable: vi.fn().mockReturnValue(false),
      encryptString: vi.fn((input: string) => Buffer.from(`enc:${input}`, 'utf-8')),
      decryptString: vi.fn((input: Buffer) => input.toString('utf-8').replace(/^enc:/, '')),
    },
    mockFs: fsMock,
  }
})

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
  app: {
    getPath: () => '/mock-user-data',
  },
}))

vi.mock('node:fs', () => ({ ...mockFs, default: mockFs }))

import { AiSettingsController } from '~/main/core/controller/aiSettingsController'

describe('AiSettingsController', () => {
  let controller: AiSettingsController

  beforeEach(() => {
    vi.resetAllMocks()
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
    mockSafeStorage.encryptString.mockImplementation((input: string) => Buffer.from(`enc:${input}`, 'utf-8'))
    mockSafeStorage.decryptString.mockImplementation((input: Buffer) => input.toString('utf-8').replace(/^enc:/, ''))
    controller = new AiSettingsController()
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    mockFs.writeFileSync.mockImplementation(() => undefined)
    mockFs.mkdirSync.mockImplementation(() => undefined)
  })

  it('initializes with empty api key when no file exists', async () => {
    await controller.initialize()
    expect(controller.getApiKey()).toBe('')
  })

  it('sets and returns api key', async () => {
    await controller.initialize()
    controller.setApiKey('sk-test-123')
    expect(controller.getApiKey()).toBe('sk-test-123')
  })

  it('clears api key when set to empty', async () => {
    await controller.initialize()
    controller.setApiKey('sk-test-123')
    controller.setApiKey('')
    expect(controller.getApiKey()).toBe('')
  })

  it('loads api key from existing encrypted file', async () => {
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
    const payload = Buffer.from(JSON.stringify({ version: 1, apiKey: 'sk-from-file' }))
    mockFs.readFileSync.mockReturnValue(mockSafeStorage.encryptString(payload.toString('utf-8')))
    await controller.initialize()
    expect(controller.getApiKey()).toBe('sk-from-file')
  })

  it('writes encrypted payload to disk when encryption available', async () => {
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
    await controller.initialize()
    controller.setApiKey('sk-secret')
    expect(mockFs.writeFileSync).toHaveBeenCalled()
    const [, data] = mockFs.writeFileSync.mock.calls[0] as [string, Buffer]
    const decrypted = mockSafeStorage.decryptString(data)
    expect(JSON.parse(decrypted)).toEqual({ version: 1, apiKey: 'sk-secret' })
  })

  it('defaults floating button to enabled', () => {
    expect(controller.getShowFloatingButton()).toBe(true)
  })

  it('sets floating button visibility', () => {
    controller.setShowFloatingButton(false)
    expect(controller.getShowFloatingButton()).toBe(false)
  })
})
