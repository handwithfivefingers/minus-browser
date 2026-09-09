import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const PermissionOverlay = lazy(() => import('./overlay/App'))

register({
  path: '/permission',
  name: 'Permission Request',
  component: PermissionOverlay,
  shell: false,
})
