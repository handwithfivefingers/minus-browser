import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import { buildRoutes } from "./routes";
import { SUB_WINDOW_EMIT, SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
// @ts-ignore
import "./assets/styles.css";

// Register all overlays (side-effect imports)
import "~/features/spotlight/overlay.register";
import "~/features/vault/overlay.register";
import "~/features/translate/overlay.register";
import "~/features/userscript/overlay.register";
import "~/features/tabGroup/overlay.register";

if (typeof window !== "undefined") {
  window.api.LISTENER(SUB_WINDOW_EMIT.NAVIGATE, (payload: { route: string }) => {
    if (payload?.route) {
      const targetHash = `#${payload.route}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      } else {
        window.location.hash = "#/";
        setTimeout(() => {
          window.location.hash = targetHash;
        }, 0);
      }
    }
  });

  window.api.LISTENER(SUB_WINDOW_EMIT.PAYLOAD, (payload: any) => {
    sessionStorage.setItem("subWindowPayload", JSON.stringify(payload));
  });
}

const routes = buildRoutes();
const router = createHashRouter(routes);
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<RouterProvider router={router} />);
