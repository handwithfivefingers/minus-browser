import { BrowserWindow } from "electron";
import { ITab, PermissionType } from "~/shared/types";
import { permissionStore } from "~/core/stores/permission.store";
import { subWindowService } from "~/features/sub-window/service";

export class TabPermission {
  isMuted: boolean = false;
  isUsingCamera: boolean = false;
  isUsingMicrophone: boolean = false;
  isUsingScreenShare: boolean = false;
  blockedNotifications: number = 0;
  constructor(props: Partial<ITab>) {
    Object.assign(this, props);
  }
  registerMediaEvents(
    webContents: Electron.WebContents,
    callback: (params: { isUsingCamera: boolean; isUsingMicrophone: boolean }) => void,
  ) {
    if (!webContents) return;
    webContents.on("media-started-playing", () => {
      webContents!
        .executeJavaScript(
          `(() => {
          const devices = [];
          if (navigator.mediaDevices?.enumerateDevices) {
            return navigator.mediaDevices.enumerateDevices().then(d => {
              d.forEach(dev => {
                if (dev.kind === 'videoinput') devices.push('video_input');
                if (dev.kind === 'audioinput') devices.push('audio_input');
              });
              return [...new Set(devices)];
            });
          }
          return [];
        })()`,
        )
        .then((mediaTypes: string[]) => {
          if (mediaTypes.includes("video_input")) {
            this.isUsingCamera = true;
          }
          if (mediaTypes.includes("audio_input")) {
            this.isUsingMicrophone = true;
          }
          callback({
            isUsingCamera: this.isUsingCamera,
            isUsingMicrophone: this.isUsingMicrophone,
          });
        })
        .catch(() => {});
    });
    webContents.on("media-paused", () => {
      webContents!
        .executeJavaScript(
          `(() => {
          const devices = [];
          if (navigator.mediaDevices?.enumerateDevices) {
            return navigator.mediaDevices.enumerateDevices().then(d => {
              return d.filter(dev =>
                dev.kind === 'videoinput' || dev.kind === 'audioinput'
              ).map(dev => dev.kind === 'videoinput' ? 'video_input' : 'audio_input');
            });
          }
          return [];
        })()`,
        )
        .then((activeTypes: string[]) => {
          const hasVideoInput = activeTypes.includes("video_input");
          const hasAudioInput = activeTypes.includes("audio_input");
          if (!hasVideoInput) this.isUsingCamera = false;
          if (!hasAudioInput) this.isUsingMicrophone = false;
          callback({
            isUsingCamera: this.isUsingCamera,
            isUsingMicrophone: this.isUsingMicrophone,
          });
        })
        .catch(() => {
          this.isUsingCamera = false;
          this.isUsingMicrophone = false;
          callback({
            isUsingCamera: false,
            isUsingMicrophone: false,
          });
        });
    });
  }
  requestPermissions(
    id: string,
    webContents: Electron.WebContents,
    persistInformationToRenderer: (params: { isUsingScreenShare?: boolean; blockedNotifications?: number }) => void,
  ) {
    if (!webContents) return;
    webContents.session.setDisplayMediaRequestHandler(
      (request, callback) => {
        this.isUsingScreenShare = true;
        persistInformationToRenderer({ isUsingScreenShare: true });
        const stream = request.frame || undefined;
        callback({ video: stream });
      },
      { useSystemPicker: true },
    );
    webContents.session.setPermissionRequestHandler(async (wc, permission, request) => {
      const permissionType = permission as PermissionType;

      const autoDenyPermissions: PermissionType[] = [
        "unknown",
        "fileSystem",
        "storage-access",
        "top-level-storage-access",
        "mediaKeySystem",
      ];
      if (autoDenyPermissions.includes(permissionType)) {
        return request(false);
      }

      const autoGrantPermissions: PermissionType[] = [
        "clipboard-write",
        "pointerLock",
        "fullscreen",
        "midi",
        "midiSysex",
      ];
      if (autoGrantPermissions.includes(permissionType)) {
        return request(true);
      }

      const origin = (() => {
        try {
          return new URL(wc.getURL()).origin;
        } catch {
          return wc.getURL();
        }
      })();
      const stored = permissionStore.getSitePermission(origin, permissionType);
      if (stored === "grant") {
        return request(true);
      }
      if (stored === "deny") {
        if (permissionType === "notifications") {
          this.blockedNotifications += 1;
          persistInformationToRenderer({ blockedNotifications: this.blockedNotifications });
        }
        return request(false);
      }

      try {
        const result = await subWindowService.openWithResult("/permission", {
          permission: permissionType,
          origin,
        });
        const { decision, remember } = result || {};
        if (remember) {
          permissionStore.setSitePermission(origin, permissionType, decision ? "grant" : "deny");
        }
        request(!!decision);
      } catch {
        request(false);
      }
    });
    webContents.setWindowOpenHandler(({ url }) => {
      try {
        const browserView = BrowserWindow.getFocusedWindow();
        browserView?.webContents?.send("CREATE_TAB", { url: url });
        return { action: "deny" };
      } catch (error) {
        return { action: "deny" };
      }
    });
  }

  //   peristInformationToRenderer(information: Partial<ITab>) {
  //     const browser = BrowserWindow.getFocusedWindow();
  //     browser?.webContents?.send(`TAB_INFORMATION_UPDATED:${this.id}`, information);
  //   }
}
