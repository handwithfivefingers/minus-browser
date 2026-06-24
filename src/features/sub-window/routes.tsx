import { getRegistered } from "./registry";
import OverlayPage from "./pages/overlay-page";
// import SpotlightPage from "../spotlight/overlay/App";
export function buildRoutes() {
  const entries = getRegistered();
  console.log("entries", entries);
  return [
    {
      path: "/",
      element: <div className="flex items-center justify-center h-screen text-white/30 text-sm">Select an overlay</div>,
    },

    ...entries.map((entry) => ({
      path: entry.path,
      element: <OverlayPage register={entry} />,
    })),
    // {
    //   path: "/spotlight",
    //   name: "Spotlight",
    //   component: SpotlightPage,
    // },
  ];
}
