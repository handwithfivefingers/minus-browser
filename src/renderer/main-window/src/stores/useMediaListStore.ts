import { create } from 'zustand'

import { MediaTabEntry } from '~/shared/types'

interface MediaListStore {
  tabs: MediaTabEntry[]
  setTabs: (tabs: MediaTabEntry[]) => void
}

export const useMediaListStore = create<MediaListStore>((set) => ({
  tabs: [],
  setTabs: (tabs) => set({ tabs }),
}))
