import { ipcRenderer } from "electron";
import { DOMMonitor } from "@ghostery/adblocker-content";

function injectCosmeticFilters(data?: any): Promise<void> {
  return ipcRenderer.invoke("@adb/inject-cosmetic-filters", window.location.href, data);
}

if (window === window.top && !window.location.href.startsWith("devtools://")) {
  let domMonitor: DOMMonitor | null = null;

  const unload = () => {
    if (domMonitor) {
      domMonitor.stop();
      domMonitor = null;
    }
  };

  injectCosmeticFilters();

  window.addEventListener(
    "DOMContentLoaded",
    () => {
      domMonitor = new DOMMonitor((update) => {
        if (update.type === "features") {
          injectCosmeticFilters(update);
        }
      });

      domMonitor.queryAll(window);

      ipcRenderer
        .invoke("@adb/is-mutation-observer-enabled")
        .then((enabled) => enabled && domMonitor?.start(window));
    },
    { once: true, passive: true },
  );

  window.addEventListener("unload", unload, { once: true, passive: true });
}
