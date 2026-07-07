import { useEffect, useState } from "react";
import { SUB_WINDOW_INVOKE, SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import { PermissionType } from "~/shared/types";

interface PermissionPayload {
  requestId: string;
  permission: PermissionType;
  origin: string;
}

export default function PermissionOverlay() {
  const [payload, setPayload] = useState<PermissionPayload | null>(null);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        setPayload(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const handleResponse = async (decision: boolean) => {
    if (!payload) return;
    await window.api.INVOKE(SUB_WINDOW_INVOKE.RESOLVE, {
      requestId: payload.requestId,
      payload: { decision, remember },
    });
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  if (!payload) return null;

  const originDisplay = (() => {
    try {
      return new URL(payload.origin).hostname;
    } catch {
      return payload.origin;
    }
  })();

  const permissionLabel = (() => {
    const labels: Record<string, string> = {
      geolocation: "Location",
      notifications: "Notifications",
      microphone: "Microphone",
      camera: "Camera",
      media: "Media",
      "clipboard-read": "Read Clipboard",
      "clipboard-write": "Write Clipboard",
      midi: "MIDI",
      midiSysex: "MIDI Sysex",
      pointerLock: "Pointer Lock",
      fullscreen: "Fullscreen",
      openExternal: "Open External",
      serial: "Serial Port",
      usb: "USB",
      hid: "HID",
    };
    return labels[payload.permission] || payload.permission;
  })();

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] animate-slide-down">
      <div className="w-96 rounded-2xl border border-white/10 bg-slate-900/95 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
              {originDisplay.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{originDisplay}</p>
              <p className="text-xs text-white/50 truncate">{payload.origin}</p>
            </div>
          </div>

          <p className="text-sm text-white/80 mb-5">
            wants to use <span className="font-semibold text-white">{permissionLabel}</span>
          </p>

          <label className="flex items-center gap-2.5 mb-5 cursor-pointer group">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
              Remember this decision for this site
            </span>
          </label>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => handleResponse(false)}
              className="px-5 py-2 text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              Block
            </button>
            <button
              type="button"
              onClick={() => handleResponse(true)}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all cursor-pointer"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
