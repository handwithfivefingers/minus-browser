import { userScriptController } from '~/features/userscript/controllers'
import { parseUserScriptMetadata } from '~/features/userscript/parser'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { subWindowService } from '../service'

export const userScriptInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.GET_USERSCRIPTS]: async () => {
    await userScriptController.initialize()
    return userScriptController.listScripts()
  },
  [IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT]: (data: any) => userScriptController.saveScript(data),
  [IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT]: (data: { id: string } | string) =>
    userScriptController.deleteScript(typeof data === 'string' ? data : data.id),
  [IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT]: ({ id, enabled }: { id: string; enabled?: boolean }) =>
    userScriptController.toggleScript(id, enabled),
  [IPC_INVOKE_CHANNEL.USERSCRIPT_OPEN_MANAGER]: async () => {
    await userScriptController.initialize()
    const scripts = userScriptController.listScripts()
    subWindowService.open('/userscript', { items: scripts })
    return { success: true }
  },
  [IPC_INVOKE_CHANNEL.IMPORT_USERSCRIPT]: async () => {
    const result = await userScriptController.importScriptFromFile()
    return { success: !!result, script: result }
  },
  [IPC_INVOKE_CHANNEL.USERSCRIPT_GET_SCRIPTS_FOR_URL]: async ({ url }: { url: string }) => {
    await userScriptController.initialize()
    return userScriptController.getScriptsForURL(url)
  },
  [IPC_INVOKE_CHANNEL.USERSCRIPT_GET_MATCHING_SCRIPTS]: async ({ url }: { url: string }) => {
    await userScriptController.initialize()
    const scripts = await userScriptController.getScriptsForURL(url)
    const payload = scripts.map((s) => {
      const meta = parseUserScriptMetadata(s.source)
      return {
        id: s.id,
        name: s.name,
        source: s.source,
        grants: s.grants || [],
        runAt: s.runAt || 'document-start',
        noframes: s.noframes || false,
        requires: s.requires || [],
        resources: s.resources || [],
        metadata: meta,
      }
    })
    return { scripts: payload }
  },
  [IPC_INVOKE_CHANNEL.USERSCRIPT_PARSE_METADATA]: async ({ source }: { source: string }) => {
    return parseUserScriptMetadata(source)
  },
}
