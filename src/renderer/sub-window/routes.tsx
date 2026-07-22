import OverlayPage from './pages/overlay-page'
import { getRegistered } from './registry'
// import SpotlightPage from "../spotlight/overlay/App";
export function buildRoutes() {
  const entries = getRegistered()
  return [
    {
      path: '/',
      element: <div className="flex h-screen items-center justify-center text-sm text-white/30">Select an overlay</div>,
    },

    ...entries.map((entry) => ({
      path: entry.path,
      element: <OverlayPage register={entry} />,
    })),
  ]
}
