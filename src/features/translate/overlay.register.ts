import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const TranslatePage = lazy(() => import('./overlay/App'))

register({
  path: '/translate',
  name: 'Translate',
  component: TranslatePage,
  shell: true,
})
