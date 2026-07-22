import { ipcMain } from 'electron'

import { handleClipboard } from './clipboard'
import { handleDownload } from './download'
import { handleLog } from './log'
import { abortRequest, handleNetwork } from './network'
import { handleNotification } from './notification'
import { handleGetResourceText, handleGetResourceURL } from './resource'
import { handleStorage } from './storage'
import { handleGetTab, handleGetTabs, handleOpenInTab, handleSaveTab } from './tab'

const pendingGMCallbacks = new Map<string, (data: any) => void>()

export function registerGMAPIHandlers(): void {
  ipcMain.on('GM:REQUEST', async (event, request) => {
    const { requestId, scriptId, method, args } = request

    try {
      switch (method) {
        case 'GM_getValue':
        case 'GM_setValue':
        case 'GM_deleteValue':
        case 'GM_listValues':
        case 'GM.getValue':
        case 'GM.setValue':
        case 'GM.deleteValue':
        case 'GM.listValues': {
          const result = await handleStorage(scriptId, method, args)
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: result })
          break
        }

        case 'GM_xmlhttpRequest':
        case 'GM.xmlHttpRequest': {
          await handleNetwork(event, requestId, scriptId, args)
          break
        }

        case 'GM_notification':
        case 'GM.notification': {
          handleNotification(event, requestId, scriptId, args)
          break
        }

        case 'GM_setClipboard':
        case 'GM.setClipboard': {
          const clipResult = handleClipboard(method, args)
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: clipResult })
          break
        }

        case 'GM_openInTab':
        case 'GM.openInTab': {
          const tabResult = await handleOpenInTab(args)
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: tabResult })
          break
        }

        case 'GM_getTab':
        case 'GM.getTab': {
          const getTabResult = await handleGetTab()
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: getTabResult })
          break
        }

        case 'GM_saveTab':
        case 'GM.saveTab': {
          await handleSaveTab(args)
          event.sender.send('GM:RESPONSE', { requestId, success: true })
          break
        }

        case 'GM_getTabs':
        case 'GM.getTabs': {
          const tabsResult = await handleGetTabs()
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: tabsResult })
          break
        }

        case 'GM_download':
        case 'GM.download': {
          await handleDownload(event, requestId, args)
          break
        }

        case 'GM_getResourceText':
        case 'GM.getResourceText': {
          const textResult = await handleGetResourceText(args?.[2] || [], args)
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: textResult })
          break
        }

        case 'GM_getResourceURL':
        case 'GM.getResourceURL': {
          const urlResult = await handleGetResourceURL(args?.[2] || [], args)
          event.sender.send('GM:RESPONSE', { requestId, success: true, data: urlResult })
          break
        }

        case 'GM_log':
        case 'GM.log': {
          handleLog(scriptId, args)
          event.sender.send('GM:RESPONSE', { requestId, success: true })
          break
        }

        default:
          event.sender.send('GM:RESPONSE', {
            requestId,
            success: false,
            error: `Unknown GM method: ${method}`,
          })
      }
    } catch (error: any) {
      event.sender.send('GM:RESPONSE', {
        requestId,
        success: false,
        error: error.message || String(error),
      })
    }
  })

  ipcMain.on('GM:ABORT', (_event, { requestId }) => {
    abortRequest(requestId)
  })
}
