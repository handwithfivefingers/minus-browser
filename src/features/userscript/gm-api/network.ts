import { net } from 'electron'

import { userScriptController } from '../controllers'
import { GMRequest } from '../types'

const activeRequests = new Map<string, { abort: () => void }>()

export function abortRequest(requestId: string) {
  const req = activeRequests.get(requestId)
  if (req) {
    req.abort()
    activeRequests.delete(requestId)
  }
}

function isValidScheme(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function hostMatches(pattern: string, hostname: string): boolean {
  const normalized = pattern.toLowerCase().replace(/^www\./, '')
  if (normalized === hostname) return true
  if (normalized.startsWith('*.')) {
    return hostname.endsWith(normalized.slice(1))
  }
  return false
}

function isSameOrigin(sourceURL: string, targetURL: string): boolean {
  try {
    return new URL(sourceURL).origin === new URL(targetURL).origin
  } catch {
    return false
  }
}

function isConnectAllowed(scriptId: string, url: string, sourceURL: string): boolean {
  try {
    const target = new URL(url)
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return false

    const script = userScriptController.listScripts().find((s) => s.id === scriptId)
    const connect = script?.connect ?? []
    if (connect.includes('*')) return true
    if (connect.length === 0) return isSameOrigin(sourceURL, url)

    const hostname = target.hostname.toLowerCase().replace(/^www\./, '')
    return connect.some((pattern) => hostMatches(pattern, hostname))
  } catch {
    return false
  }
}

export async function handleNetwork(
  event: Electron.IpcMainEvent,
  requestId: string,
  scriptId: string,
  args: any[]
): Promise<void> {
  const details = args[0] || {}
  const {
    url,
    method = 'GET',
    headers,
    data,
    binary = false,
    nocache = false,
    timeout,
    responseType = 'text',
    overrideMimeType,
  } = details

  if (!url) {
    event.sender.send('GM:RESPONSE', {
      requestId,
      success: false,
      error: 'URL is required',
    })
    return
  }

  if (!isValidScheme(url) || !isConnectAllowed(scriptId, url, event.senderFrame?.url || '')) {
    event.sender.send('GM:RESPONSE', {
      requestId,
      success: false,
      error: `Access to "${url}" is denied by the script's @connect allowlist`,
      denied: true,
    })
    return
  }

  const controller = new AbortController()
  const requestInfo = { abort: () => controller.abort() }
  activeRequests.set(requestId, requestInfo)

  const fetchHeaders: Record<string, string> = { ...headers }
  if (nocache) {
    fetchHeaders['Cache-Control'] = 'no-cache'
  }

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
    signal: controller.signal,
  }

  if (data) {
    fetchOptions.body = data
  }

  if (timeout && timeout > 0) {
    const timeoutId = setTimeout(() => {
      controller.abort()
      event.sender.send('GM:RESPONSE', {
        requestId,
        success: false,
        error: 'Timeout',
      })
      activeRequests.delete(requestId)
    }, timeout)

    requestInfo.abort = () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }

  try {
    const response = await fetch(url, fetchOptions)

    let responseData: any
    if (responseType === 'json') {
      responseData = await response.json()
    } else if (responseType === 'blob' || responseType === 'arraybuffer') {
      responseData = await response.arrayBuffer()
    } else if (responseType === 'stream') {
      responseData = await response.text()
    } else {
      responseData = await response.text()
    }

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    const result = {
      finalUrl: response.url,
      readyState: 4,
      status: response.status,
      statusText: response.statusText,
      responseHeaders: JSON.stringify(responseHeaders),
      response: responseData,
      responseText:
        responseType === 'text'
          ? responseData
          : await response
              .clone()
              .text()
              .catch(() => ''),
      responseXML: null as any,
    }

    event.sender.send('GM:RESPONSE', {
      requestId,
      success: true,
      data: result,
    })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      event.sender.send('GM:RESPONSE', {
        requestId,
        success: false,
        error: 'Aborted',
        aborted: true,
      })
    } else {
      event.sender.send('GM:RESPONSE', {
        requestId,
        success: false,
        error: error.message || String(error),
      })
    }
  } finally {
    activeRequests.delete(requestId)
  }
}
