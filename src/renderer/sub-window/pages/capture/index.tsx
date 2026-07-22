import { useEffect, useState } from 'react'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'
import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'

import { register } from '../../registry'
const CaptureComponent = () => {
  const [image, setImage] = useState<string | null>(null)
  const [type, setType] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('subWindowPayload')
    sessionStorage.removeItem('subWindowPayload')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (data.image) setImage(data.image)
        if (data.type) setType(data.type)
        if (data.copied) setCopied(true)
      } catch {
        console.log('setImage failed')
      }
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleCopy = async () => {
    try {
      await window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_COPY_CLIPBOARD)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.log('Copy failed')
    }
  }

  const handleClose = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }

  if (!image) return null

  return (
    <div
      className="flex h-full max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl"
      onClick={(event) => event.stopPropagation()}
      style={{ background: 'rgba(0,0,0,0.7)' }}
      aria-hidden
    >
      <div className="max-h-[70vh] max-w-3xl overflow-auto rounded-lg border border-white/10">
        <img src={image} alt="Captured screenshot" className="h-auto w-full" style={{ imageRendering: 'auto' }} />
      </div>

      <div className="flex gap-3 p-2">
        <button
          onClick={handleCopy}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
        <button
          onClick={handleClose}
          className="cursor-pointer rounded-lg bg-slate-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-500"
        >
          Close
        </button>
      </div>
    </div>
  )
}
export const CapturePage = register({
  path: '/capture',
  name: 'Capture',
  shell: true,
  component: CaptureComponent,
})
