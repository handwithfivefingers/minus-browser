import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const PopupPrompt = lazy(() => import('./popup/App'))

register({
  path: '/popup',
  name: 'Popup Request',
  component: PopupPrompt,
  shell: false,
})
