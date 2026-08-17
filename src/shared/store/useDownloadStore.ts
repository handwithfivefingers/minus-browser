import { create } from 'zustand'

import { DownloadItem } from '~/shared/types/download'

interface DownloadStore {
  downloads: DownloadItem[]
  setDownloads: (items: DownloadItem[]) => void
  upsert: (item: DownloadItem) => void
  remove: (id: string) => void
  clear: () => void
}

const useDownloadStore = create<DownloadStore>((set) => ({
  downloads: [],
  setDownloads: (items) => set({ downloads: items }),
  upsert: (item) =>
    set((s) => {
      const idx = s.downloads.findIndex((d) => d.id === item.id)
      if (idx === -1) return { downloads: [item, ...s.downloads] }
      const downloads = [...s.downloads]
      downloads[idx] = item
      return { downloads }
    }),
  remove: (id) => set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) })),
  clear: () => set({ downloads: [] }),
}))

export { useDownloadStore }
