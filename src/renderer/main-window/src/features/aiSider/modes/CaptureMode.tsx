import { IconPhoto, IconClipboard, IconCamera, IconSelector } from '@tabler/icons-react'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { useAiSidebarStore } from '../stores/useAiSidebarStore'

const CaptureMode = () => {
  const { capturedImage, setCapturedImage, setMode } = useAiSidebarStore()

  const handleCapturePage = async () => {
    try {
      const result = await window.api.INVOKE<{ success: boolean; image?: string }>(IPC_INVOKE_CHANNEL.CAPTURE_PAGE)
      if (result?.image) {
        setCapturedImage(result.image)
      }
    } catch {
      console.log('Capture failed')
    }
  }

  const handleCaptureSelection = async () => {
    try {
      await window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION)
    } catch {
      console.log('Capture failed')
    }
  }

  const handleClear = () => {
    setCapturedImage(null)
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCapturePage}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <IconCamera size={14} />
          Capture Page
        </button>
        <button
          type="button"
          onClick={handleCaptureSelection}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-500"
        >
          <IconSelector size={14} />
          Select Region
        </button>
      </div>

      {capturedImage ? (
        <div className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-lg border border-slate-200">
            <img
              src={capturedImage}
              alt="Captured screenshot"
              className="h-auto max-h-48 w-full bg-slate-100 object-contain"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_COPY_CLIPBOARD)
                } catch {
                  console.log('Capture failed')
                }
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <IconClipboard size={14} />
              Copy
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-300"
            >
              Clear
            </button>
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">AI Actions</p>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-200"
              onClick={() => setMode('chat')}
            >
              <IconPhoto size={14} />
              Describe this image
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-slate-400">
            <IconPhoto size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No screenshot captured yet</p>
            <p className="mt-1 text-[10px]">{`Click "Capture Page" or "Select Region" above`}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export { CaptureMode }
