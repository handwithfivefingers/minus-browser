import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'

import { SUB_WINDOW_EMIT } from '~/shared/constants/ipc/sub-window'

import { initTheme } from './hooks/useTheme'
import { setPayload } from './payload-store'
import { buildRoutes } from './routes'

// @ts-ignore
import '~/shared/assets/global.css'

// Register all overlays (side-effect imports)
import './pages/capture'
import './pages/spotlight'
import './pages/TabContext'
import './pages/MediaList'
import './pages/downloads'
import '~/features/permission/overlay.register'
import '~/features/permission/siteInfo.register'
import '~/features/permission/popup.register'
import '~/features/translate/overlay.register'
import '~/features/userscript/overlay.register'
import '~/features/vault/overlay.register'

initTheme()

const routes = buildRoutes()
const router = createHashRouter(routes)

if (typeof window !== 'undefined') {
  window.api.LISTENER(SUB_WINDOW_EMIT.PAYLOAD, (payload: any) => {
    setPayload(payload)
    sessionStorage.setItem('subWindowPayload', JSON.stringify(payload))
  })

  /**
   * Navigate through the router instead of mutating `window.location.hash`
   * directly. Raw hash mutations fight React Router's internal history index
   * (`window.history.state.idx`) and can drift out of sync after repeated
   * open/close cycles.
   *
   * A same-route reopen (e.g. duplicate Ctrl+K / click while Spotlight is
   * visible) bounces through the placeholder with `replace` + `navigate` so
   * the overlay component deterministically remounts and re-reads the fresh
   * payload — no `setTimeout` racing with subsequent close/open messages.
   */
  window.api.LISTENER(SUB_WINDOW_EMIT.NAVIGATE, (payload: { route: string }) => {
    if (!payload?.route) return
    const target = payload.route
    const current = window.location.hash.replace(/^#/, '') || '/'
    if (current === target) {
      if (target === '/') return // already on the placeholder route
      router.navigate('/', { replace: true })
    }
    router.navigate(target)
  })
}

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<RouterProvider router={router} />)
