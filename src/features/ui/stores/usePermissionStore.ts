import { create } from "zustand";
import { PermissionRequest, PermissionType } from "~/shared/types";

interface PermissionStoreState {
  pendingRequests: PermissionRequest[];
  addRequest: (request: PermissionRequest) => void;
  removeRequest: (requestId: string) => void;
}

export const usePermissionStore = create<PermissionStoreState>((set, get) => ({
  pendingRequests: [],
  addRequest: (request) =>
    set((state) => ({
      pendingRequests: [...state.pendingRequests.filter((r) => r.requestId !== request.requestId), request],
    })),
  removeRequest: (requestId) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.requestId !== requestId),
    })),
}));

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

export function getPermissionLabel(permission: PermissionType): string {
  return permissionLabels[permission] || permission;
}

export function getPermissionIcon(permission: PermissionType): string {
  switch (permission) {
    case "geolocation": return "📍";
    case "notifications": return "🔔";
    case "microphone": return "🎤";
    case "camera": return "📷";
    case "media": return "🎥";
    default: return "🔒";
  }
}
