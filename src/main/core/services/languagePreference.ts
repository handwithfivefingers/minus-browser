import { app, ipcMain } from 'electron'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

export const FALLBACK_LANGUAGES = ['vi-VN', 'vi']

let preference: string[] | undefined

function getSystemLanguages(): string[] {
  try {
    const languages = app.getPreferredSystemLanguages().filter(Boolean)
    return languages.length ? languages : FALLBACK_LANGUAGES
  } catch {
    return FALLBACK_LANGUAGES
  }
}

export function getLanguagePreference(): string[] {
  return preference && preference.length ? preference : getSystemLanguages()
}

export function setLanguagePreference(languages?: string[]): string[] {
  const resolved = languages?.filter(Boolean) || []
  preference = resolved.length ? resolved : undefined
  return getLanguagePreference()
}

export function registerLanguagePreferenceIpc() {
  ipcMain.on(IPC_INVOKE_CHANNEL.LANGUAGE_GET, (event) => {
    event.returnValue = getLanguagePreference()
  })
}
