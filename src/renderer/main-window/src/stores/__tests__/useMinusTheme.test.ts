import { describe, it, expect, beforeEach } from 'vitest'
import { useMinusThemeStore } from '~/renderer/main-window/src/stores/useMinusTheme'

describe('useMinusThemeStore', () => {
  beforeEach(() => {
    useMinusThemeStore.setState({
      layout: 'FLOATING',
      mode: 'auto',
      dataSync: { intervalTime: '15', hardwareAcceleration: 'on' },
      extension: {
        adblock: true,
        vault: true,
        translate: true,
        userscript: true,
        cosmeticFiltering: true,
        disabledFilters: [],
        customFilters: [],
        adblockAutoUpdate: true,
        adblockAutoUpdateInterval: 360,
      },
      historyRetentionDays: '30',
      hibernateMode: 'normal',
      hibernateCustomMinutes: 60,
      autoDownload: true,
      notificationRetentionDays: '30',
    } as any)
  })

  it('has default layout', () => {
    expect(useMinusThemeStore.getState().layout).toBe('FLOATING')
  })

  it('sets layout', () => {
    useMinusThemeStore.getState().setLayout('BASIC')
    expect(useMinusThemeStore.getState().layout).toBe('BASIC')
  })

  it('sets mode', () => {
    useMinusThemeStore.getState().setMode('dark')
    expect(useMinusThemeStore.getState().mode).toBe('dark')
  })

  it('sets cookie mode', () => {
    useMinusThemeStore.getState().setCookieMode('1')
    expect(useMinusThemeStore.getState().savedCookies).toBe('1')
  })

  it('sets history retention days', () => {
    useMinusThemeStore.getState().setHistoryRetentionDays('90')
    expect(useMinusThemeStore.getState().historyRetentionDays).toBe('90')
  })

  it('sets hibernate settings', () => {
    useMinusThemeStore.getState().setHibernateMode('slow')
    expect(useMinusThemeStore.getState().hibernateMode).toBe('slow')
    useMinusThemeStore.getState().setHibernateCustomMinutes(30)
    expect(useMinusThemeStore.getState().hibernateCustomMinutes).toBe(30)
  })

  it('sets auto download', () => {
    useMinusThemeStore.getState().setAutoDownload(false)
    expect(useMinusThemeStore.getState().autoDownload).toBe(false)
  })

  it('sets notification retention days', () => {
    useMinusThemeStore.getState().setNotificationRetentionDays('7')
    expect(useMinusThemeStore.getState().notificationRetentionDays).toBe('7')
  })

  it('sets extension settings partially', () => {
    useMinusThemeStore.getState().setExtension({ adblock: false, vault: false })
    const ext = useMinusThemeStore.getState().extension
    expect(ext.adblock).toBe(false)
    expect(ext.vault).toBe(false)
    expect(ext.translate).toBe(true)
  })

  it('initializes store with data', () => {
    useMinusThemeStore.getState().initialize({ layout: 'BASIC', mode: 'dark' } as any)
    expect(useMinusThemeStore.getState().layout).toBe('BASIC')
    expect(useMinusThemeStore.getState().mode).toBe('dark')
  })
})
