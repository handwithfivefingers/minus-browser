import { IconPhoto, IconClipboard, IconCamera, IconSelector } from "@tabler/icons-react";
import { useAiSidebarStore } from "../stores/useAiSidebarStore";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";

const CaptureMode = () => {
  const { capturedImage, setCapturedImage, setMode } = useAiSidebarStore();

  const handleCapturePage = async () => {
    try {
      const result = await window.api.INVOKE<{ success: boolean; image?: string }>(
        IPC_INVOKE_CHANNEL.CAPTURE_PAGE,
      );
      if (result?.image) {
        setCapturedImage(result.image);
      }
    } catch {}
  };

  const handleCaptureSelection = async () => {
    try {
      await window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION);
    } catch {}
  };

  const handleClear = () => {
    setCapturedImage(null);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCapturePage}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors"
        >
          <IconCamera size={14} />
          Capture Page
        </button>
        <button
          type="button"
          onClick={handleCaptureSelection}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium cursor-pointer transition-colors"
        >
          <IconSelector size={14} />
          Select Region
        </button>
      </div>

      {capturedImage ? (
        <div className="flex flex-col gap-2">
          <div className="relative rounded-lg overflow-hidden border border-slate-200">
            <img
              src={capturedImage}
              alt="Captured screenshot"
              className="w-full h-auto max-h-48 object-contain bg-slate-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_COPY_CLIPBOARD);
                } catch {}
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors"
            >
              <IconClipboard size={14} />
              Copy
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-medium cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">AI Actions</p>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer transition-colors"
              onClick={() => setMode("chat")}
            >
              <IconPhoto size={14} />
              Describe this image
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <IconPhoto size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No screenshot captured yet</p>
            <p className="text-[10px] mt-1">Click "Capture Page" or "Select Region" above</p>
          </div>
        </div>
      )}
    </div>
  );
};

export { CaptureMode };
