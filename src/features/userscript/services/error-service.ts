import { ipcMain } from 'electron'

interface ScriptErrorEntry {
  scriptId: string
  scriptName: string
  message: string
  stack?: string
  url: string
  timestamp: number
}

const scriptErrors = new Map<string, ScriptErrorEntry[]>()

export function registerErrorHandler(): void {
  ipcMain.on('USERSCRIPT_REPORT_ERROR', (_event, data) => {
    const { scriptId, scriptName, message, stack, url } = data
    const entry: ScriptErrorEntry = {
      scriptId,
      scriptName,
      message,
      stack,
      url,
      timestamp: Date.now(),
    }
    const existing = scriptErrors.get(scriptId) || []
    existing.push(entry)
    if (existing.length > 50) existing.shift()
    scriptErrors.set(scriptId, existing)
    console.error(`[UserScript Error] ${scriptName}: ${message}`)
  })

  ipcMain.handle('USERSCRIPT_GET_ERRORS', async (_event, scriptId?: string) => {
    if (scriptId) {
      return scriptErrors.get(scriptId) || []
    }
    const all: Record<string, ScriptErrorEntry[]> = {}
    scriptErrors.forEach((entries, id) => {
      all[id] = entries
    })
    return all
  })

  ipcMain.handle('USERSCRIPT_CLEAR_ERRORS', async (_event, scriptId?: string) => {
    if (scriptId) {
      scriptErrors.delete(scriptId)
    } else {
      scriptErrors.clear()
    }
    return { success: true }
  })
}

export function getScriptErrors(scriptId: string): ScriptErrorEntry[] {
  return scriptErrors.get(scriptId) || []
}

export function getAllErrors(): Record<string, ScriptErrorEntry[]> {
  const all: Record<string, ScriptErrorEntry[]> = {}
  scriptErrors.forEach((entries, id) => {
    all[id] = entries
  })
  return all
}

export function clearErrors(scriptId?: string): void {
  if (scriptId) scriptErrors.delete(scriptId)
  else scriptErrors.clear()
}
