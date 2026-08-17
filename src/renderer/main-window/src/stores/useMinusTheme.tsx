import { create } from 'zustand'

import { IMinusThemeStore } from '~/renderer/main-window/src/interfaces'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

const useMinusThemeStore = create<IMinusThemeStore>((set, get) => ({
  layout: 'FLOATING',
  mode: 'auto',
  dataSync: {
    intervalTime: '15',
    hardwareAcceleration: 'on',
  },
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
  passwordsNeverSaveDomains: [],
  askDownloadLocation: false,
  downloadDirectory: '',
  setLayout: (layout: 'BASIC' | 'FLOATING') => {
    set({ layout })
  },
  setMode: (mode: 'light' | 'dark' | 'auto') => {
    set({ mode })
  },
  setCookieMode: (mode: '0' | '1') => {
    set({ savedCookies: mode })
  },
  setDataSyncTime: (intervalTime: string) => {
    set((state) => ({ ...state, dataSync: { ...state.dataSync, intervalTime } }))
  },
  setExtension: (extension: Partial<IMinusThemeStore['extension']>) => {
    set((state) => ({ ...state, extension: { ...state.extension, ...extension } }))
  },
  setHistoryRetentionDays: (days: string) => {
    set({ historyRetentionDays: days })
  },
  setHibernateMode: (mode: 'fast' | 'normal' | 'slow' | 'custom') => {
    set({ hibernateMode: mode })
  },
  setHibernateCustomMinutes: (minutes: number) => {
    set({ hibernateCustomMinutes: minutes })
  },
  setAutoDownload: (enabled: boolean) => {
    set({ autoDownload: enabled })
  },
  setNotificationRetentionDays: (days: string) => {
    set({ notificationRetentionDays: days })
  },
  setPasswordsNeverSaveDomains: (domains: string[]) => {
    set({ passwordsNeverSaveDomains: domains })
  },
  setDownloadDirectory: (directory: string) => {
    set({ downloadDirectory: directory })
  },
  setAskDownloadLocation: (enabled: boolean) => {
    set({ askDownloadLocation: enabled })
  },
  initialize: (data: Partial<IMinusThemeStore>) => {
    return set(data)
  },
  saved: () => {
    const data = get()
    const params = {
      layout: data.layout,
      mode: data.mode,
      dataSync: data.dataSync,
      extension: data.extension,
      savedCookies: data.savedCookies,
      historyRetentionDays: data.historyRetentionDays,
      hibernateMode: data.hibernateMode,
      hibernateCustomMinutes: data.hibernateCustomMinutes,
      autoDownload: data.autoDownload,
      notificationRetentionDays: data.notificationRetentionDays,
      passwordsNeverSaveDomains: data.passwordsNeverSaveDomains || [],
      askDownloadLocation: data.askDownloadLocation,
      downloadDirectory: data.downloadDirectory,
    }
    window?.api?.INVOKE(IPC_INVOKE_CHANNEL.INTERFACE_SAVE, params)
  },
}))

export { useMinusThemeStore }
