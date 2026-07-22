import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('findbarAPI', {
  textChange: (text: string) => {
    ipcRenderer.send('findbar:text-change', { text })
  },
  findNext: () => {
    ipcRenderer.send('findbar:find-next')
  },
  findPrevious: () => {
    ipcRenderer.send('findbar:find-previous')
  },
  close: () => {
    ipcRenderer.send('findbar:close')
  },
  matchCase: (value: boolean) => {
    ipcRenderer.send('findbar:match-case', { value })
  },
  onMatches: (callback: (active: number, total: number) => void) => {
    ipcRenderer.on('findbar:matches', (_event, data) => {
      callback(data.active, data.total)
    })
  },
  onFocusInput: (callback: () => void) => {
    ipcRenderer.on('findbar:focus-input', () => callback())
  },
})
