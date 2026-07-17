import { useEffect, useState } from "react";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import { PermissionDecision, PermissionType, SitePermissions } from "~/shared/types";

const permissionLabels: Record<string, string> = {
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

function getPermissionLabel(permission: PermissionType): string {
  return permissionLabels[permission] || permission;
}

interface AnchorRect {
  x: number; y: number; width: number; height: number;
}

export default function SiteInfoOverlay() {
  const [url, setUrl] = useState<string>("");
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [permissions, setPermissions] = useState<SitePermissions | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setUrl(data.url || "");
        setAnchor(data.anchor || null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!url) return;
    (async () => {
      try {
        const origin = new URL(url).origin;
        const perms = await window.api.INVOKE<SitePermissions>("GET_SITE_PERMISSIONS", { origin });
        setPermissions(perms || {});
      } catch {
        setPermissions(null);
      }
    })();
  }, [url]);

  const handleToggle = async (permission: PermissionType, decision: PermissionDecision) => {
    if (!url) return;
    try {
      const origin = new URL(url).origin;
      await window.api.INVOKE("SET_SITE_PERMISSION", { origin, permission, decision });
      setPermissions((prev) => ({ ...prev, [permission]: decision }));
    } catch {}
  };

  const handleResetAll = async () => {
    await window.api.INVOKE("RESET_ALL_PERMISSIONS");
    setPermissions({});
  };

  const handleClose = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const hostname = (() => {
    try {
      return new URL(url || "").hostname;
    } catch {
      return url || "";
    }
  })();

  const originStr = (() => {
    try {
      return new URL(url || "").origin;
    } catch {
      return null;
    }
  })();

  if (!url) return null;

  const popupStyle: React.CSSProperties = anchor
    ? { position: 'fixed', left: anchor.x, top: anchor.y + 4 }
    : { position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div className="fixed inset-0 z-9999" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-80 animate-slide-down" style={popupStyle}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
              {hostname.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{hostname}</span>
            <button
              type="button"
              onClick={handleClose}
              className="ml-auto text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer bg-transparent border-none p-0.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Permissions</div>

          {originStr && permissions && Object.keys(permissions).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {Object.entries(permissions).map(([perm, decision]) => (
                <div key={perm} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{getPermissionLabel(perm as PermissionType)}</span>
                  <select
                    value={decision}
                    onChange={(e) => handleToggle(perm as PermissionType, e.target.value as PermissionDecision)}
                    className="text-xs border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="grant">Allow</option>
                    <option value="deny">Block</option>
                    <option value="prompt">Ask</option>
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500">No custom permissions set</div>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[10px] text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer bg-transparent border-none"
            >
              Reset all permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
