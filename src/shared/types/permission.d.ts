export type PermissionType =
  | "geolocation"
  | "notifications"
  | "microphone"
  | "camera"
  | "media"
  | "clipboard-read"
  | "clipboard-write"
  | "clipboard-sanitized-write"
  | "midi"
  | "midiSysex"
  | "pointerLock"
  | "fullscreen"
  | "openExternal"
  | "serial"
  | "usb"
  | "hid"
  | "storage-access"
  | "top-level-storage-access"
  | "mediaKeySystem"
  | "fileSystem"
  | "unknown";

export type PermissionDecision = "grant" | "deny" | "prompt";

export interface SitePermissions {
  [permission: string]: PermissionDecision;
}

export interface PermissionRequest {
  requestId: string;
  permission: PermissionType;
  origin: string;
}
