export type UpdateStatusEvent =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'not-available' }
  | { status: 'downloading'; info: Electron.ProgressInfo }
  | { status: 'downloaded'; info: { releaseNotes: string; releaseName: string; releaseDate: Date; updateURL: string } }
  | { status: 'error'; info: string }
