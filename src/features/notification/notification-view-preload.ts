import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('notificationViewAPI', {
  onToast: (callback: (data: unknown) => void) => {
    ipcRenderer.on('NOTIFICATION_VIEW_TOAST', (_event, data) => callback(data))
  },
  onHistory: (callback: (data: unknown) => void) => {
    ipcRenderer.on('NOTIFICATION_VIEW_HISTORY', (_event, data) => callback(data))
  },
  onShowToast: (callback: () => void) => {
    ipcRenderer.on('NOTIFICATION_VIEW_SHOW_TOAST', () => callback())
  },
  onHideToast: (callback: () => void) => {
    ipcRenderer.on('NOTIFICATION_VIEW_HIDE_TOAST', () => callback())
  },
  onShowList: (callback: () => void) => {
    ipcRenderer.on('NOTIFICATION_VIEW_SHOW_LIST', () => callback())
  },
  onHideList: (callback: () => void) => {
    ipcRenderer.on('NOTIFICATION_VIEW_HIDE_LIST', () => callback())
  },
  onClickNotification: (tabId: string) => {
    ipcRenderer.send('NOTIFICATION_VIEW_CLICK', { tabId })
  },
  onMarkRead: (id: string) => {
    ipcRenderer.send('NOTIFICATION_VIEW_MARK_READ', { id })
  },
  onMarkAllRead: () => {
    ipcRenderer.send('NOTIFICATION_VIEW_MARK_ALL_READ')
  },
  onClose: () => {
    ipcRenderer.send('NOTIFICATION_VIEW_CLOSE')
  },
  onGetHistory: () => {
    ipcRenderer.send('NOTIFICATION_VIEW_GET_HISTORY')
  },
  onClearAll: () => {
    ipcRenderer.send('NOTIFICATION_VIEW_CLEAR_ALL')
  },
})
