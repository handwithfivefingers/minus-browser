import { register } from '~/renderer/sub-window/registry'

import PermissionOverlay from './overlay/App'

register({
  path: '/permission',
  name: 'Permission Request',
  component: PermissionOverlay,
  shell: false,
})
