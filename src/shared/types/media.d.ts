export interface MediaVideo {
  id: number
  title: string
  src: string
  currentTime: number
  duration: number
  paused: boolean
  poster: string
}

export interface MediaTabEntry {
  tabId: string
  title: string
  favicon?: string
  videos: MediaVideo[]
}
