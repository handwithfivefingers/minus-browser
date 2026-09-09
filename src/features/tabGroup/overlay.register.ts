import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const TabGroupPage = lazy(() => import('./overlay/App').then((m) => ({ default: m.App })))

register({
  path: '/tabgroup',
  name: 'Tab Group',
  component: TabGroupPage,
  shell: false,
})
