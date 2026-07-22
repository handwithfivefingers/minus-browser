import { BrowserWindow } from 'electron'

import { appDb } from '~/main/core/stores'

export async function handleOpenInTab(args: any[]): Promise<any> {
  const [url, options] = args

  if (!url) {
    throw new Error('URL is required for GM_openInTab')
  }

  const win = BrowserWindow.getFocusedWindow()
  if (!win) {
    throw new Error('No focused window')
  }

  const { active = true, insert = true, setParent = true } = options || {}

  win.webContents.send('GM:OPEN_TAB', { url, active, insert, setParent })

  return { closed: false }
}

export async function handleGetTab(): Promise<any> {
  const row = appDb.get<{ value: string }>("SELECT value FROM app_state WHERE key = 'gm_tab_data'")
  return row ? JSON.parse(row.value) : {}
}

export async function handleSaveTab(args: any[]): Promise<void> {
  const [obj] = args
  if (!obj) return
  const existing = await handleGetTab()
  const merged = { ...existing, ...obj }
  appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('gm_tab_data', ?)", [JSON.stringify(merged)])
}

export async function handleGetTabs(): Promise<Record<string, any>> {
  const row = appDb.get<{ value: string }>("SELECT value FROM app_state WHERE key = 'gm_tabs'")
  return row ? JSON.parse(row.value) : {}
}
