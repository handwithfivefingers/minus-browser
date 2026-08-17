export const IPC_DOWNLOAD_INVOKE = {
  GET_ALL: 'DOWNLOAD_GET_ALL',
  PAUSE: 'DOWNLOAD_PAUSE',
  RESUME: 'DOWNLOAD_RESUME',
  CANCEL: 'DOWNLOAD_CANCEL',
  OPEN: 'DOWNLOAD_OPEN',
  SHOW_IN_FOLDER: 'DOWNLOAD_SHOW_IN_FOLDER',
  REMOVE: 'DOWNLOAD_REMOVE',
  CLEAR: 'DOWNLOAD_CLEAR',
  SET_DEFAULT_DIR: 'DOWNLOAD_SET_DEFAULT_DIR',
  GET_DEFAULT_DIR: 'DOWNLOAD_GET_DEFAULT_DIR',
} as const

export const IPC_DOWNLOAD_RENDERER_EVENT = {
  /** A single download item was created or updated (progress / state changes) */
  ITEM_UPDATED: 'DOWNLOAD_ITEM_UPDATED',
  /** An item was removed or the whole list changed (full snapshot included) */
  LIST_CHANGED: 'DOWNLOAD_LIST_CHANGED',
} as const

export const IPC_DOWNLOAD_EMIT = {
  /** Open the full Downloads page in the main window */
  NAVIGATE_ALL: 'DOWNLOAD_NAVIGATE_ALL',
  /** Dismiss the download popup until the current batch finishes */
  POPUP_DISMISS: 'DOWNLOAD_POPUP_DISMISS',
} as const
