import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const SiteInfoOverlay = lazy(() => import('./siteInfo/App'))

register({
  path: '/site-info',
  name: 'Site Information',
  component: SiteInfoOverlay,
  shell: false,
})
