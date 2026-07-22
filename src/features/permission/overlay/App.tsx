import { useEffect, useState } from 'react'

import { SUB_WINDOW_INVOKE, SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'
import { PermissionType } from '~/shared/types'

interface PermissionPayload {
  requestId: string
  permission: PermissionType
  origin: string
}

export default function PermissionOverlay() {
  const [payload, setPayload] = useState<PermissionPayload | null>(null)
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('subWindowPayload')
    sessionStorage.removeItem('subWindowPayload')
    if (raw) {
      try {
        setPayload(JSON.parse(raw))
      } catch {}
    }
  }, [])

  const handleResponse = async (decision: boolean) => {
    if (!payload) return
    await window.api.INVOKE(SUB_WINDOW_INVOKE.RESOLVE, {
      requestId: payload.requestId,
      payload: { decision, remember },
    })
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }

  if (!payload) return null

  const originDisplay = (() => {
    try {
      return new URL(payload.origin).hostname
    } catch {
      return payload.origin
    }
  })()

  const permissionLabel = (() => {
    const labels: Record<string, string> = {
      geolocation: 'Location',
      notifications: 'Notifications',
      microphone: 'Microphone',
      camera: 'Camera',
      media: 'Media',
      'clipboard-read': 'Read Clipboard',
      'clipboard-write': 'Write Clipboard',
      midi: 'MIDI',
      midiSysex: 'MIDI Sysex',
      pointerLock: 'Pointer Lock',
      fullscreen: 'Fullscreen',
      openExternal: 'Open External',
      serial: 'Serial Port',
      usb: 'USB',
      hid: 'HID',
    }
    return labels[payload.permission] || payload.permission
  })()

  return (
    <div className="animate-slide-down fixed top-2 left-1/2 z-[9999] -translate-x-1/2">
      <div className="w-96 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">
              {originDisplay.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{originDisplay}</p>
              <p className="truncate text-xs text-white/50">{payload.origin}</p>
            </div>
          </div>

          <p className="mb-5 text-sm text-white/80">
            wants to use <span className="font-semibold text-white">{permissionLabel}</span>
          </p>

          <label className="group mb-5 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0"
            />
            <span className="text-xs text-white/60 transition-colors group-hover:text-white/80">
              Remember this decision for this site
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleResponse(false)}
              className="cursor-pointer rounded-lg bg-white/5 px-5 py-2 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              Block
            </button>
            <button
              type="button"
              onClick={() => handleResponse(true)}
              className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
