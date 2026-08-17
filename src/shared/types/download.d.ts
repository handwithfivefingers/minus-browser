export type DownloadState = 'progressing' | 'interrupted' | 'completed' | 'cancelled'

export interface DownloadItem {
  /** Unique id assigned by the main process */
  id: string
  filename: string
  url: string
  /** Absolute path where the file is / will be saved */
  savePath: string
  mimeType?: string
  totalBytes: number
  receivedBytes: number
  /** 0 - 100, computed from receivedBytes / totalBytes */
  progress: number
  state: DownloadState
  /** True while the download can be resumed after being paused/interrupted */
  canResume: boolean
  /** True while the download is user-paused */
  paused?: boolean
  startedAt: number
  endedAt?: number
}
