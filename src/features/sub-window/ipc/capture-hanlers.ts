import { clipboard } from "electron";
import { ViewController } from "~/core/controller/viewController";
import { capturePage } from "~/features/capture/services";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { subWindowService } from "../service";
import { CAPTURE_SELECTION_SCRIPT } from "~/features/capture/plugin/selectionScript";

let lastCaptureImage = null;

export const captureInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.CAPTURE_PAGE]: async (viewController: ViewController) => {
    try {
      const { window, forwardRendererEvent, tabController } = viewController || {};
      if (!window || !tabController?.activeTab) return { success: false, error: "No active tab" };
      if (!forwardRendererEvent) return { success: false, error: "No forwardRendererEvent" };
      if (!tabController?.activeTab?.isAlive) return { success: false, error: "No active tab" };
      const { nativeImage, dataURL } = await capturePage(tabController?.activeTab?.webContents);
      lastCaptureImage = nativeImage;
      clipboard.writeImage(nativeImage);
      subWindowService.open("/capture", { image: dataURL, type: "page", copied: true });
      forwardRendererEvent("CAPTURE_RESULT", { image: dataURL, tabId: tabController?.activeTab.id });
      return { success: true, image: dataURL };
    } catch {
      return { success: false, error: "Capture failed" };
    }
  },
  [IPC_INVOKE_CHANNEL.CAPTURE_SELECTION]: async (viewController: ViewController) => {
    try {
      const activeTab = viewController.tabController?.activeTab;
      if (!activeTab?.isAlive) return { success: false, error: "No active tab" };
      await activeTab.webContents.executeJavaScript(CAPTURE_SELECTION_SCRIPT, true);
      return { success: true };
    } catch {
      return { success: false, error: "Failed to inject selection script" };
    }
  },
  ["CAPTURE_SELECTION_RESULT"]: async (
    viewController: ViewController,
    data?: {
      rect: { x: number; y: number; w: number; h: number };
      tabId: string;
    },
  ) => {
    try {
      if (!data) return { success: false, error: "No data" };
      const tab = viewController.tabController?.getTabById(data.tabId);
      if (!tab?.isAlive) return { success: false, error: "Tab not found" };
      const rect: Electron.Rectangle = {
        x: data.rect.x,
        y: data.rect.y,
        width: data.rect.w,
        height: data.rect.h,
      };
      const { nativeImage, dataURL } = await capturePage(tab.webContents, rect);
      viewController.lastCaptureImage = nativeImage;
      clipboard.writeImage(nativeImage);
      subWindowService.open("/capture", { image: dataURL, type: "selection", copied: true });
      viewController.forwardRendererEvent("CAPTURE_RESULT", { image: dataURL, tabId: data.tabId });
      return { success: true, image: dataURL };
    } catch {
      return { success: false, error: "Capture failed" };
    }
  },
  [IPC_INVOKE_CHANNEL.CAPTURE_COPY_CLIPBOARD]: async (viewController: ViewController) => {
    if (viewController.lastCaptureImage) {
      clipboard.writeImage(viewController.lastCaptureImage);
      return Promise.resolve({ success: true });
    }
    return { success: false, error: "No captured image" };
  },
};
