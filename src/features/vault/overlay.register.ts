import { register } from '~/renderer/sub-window/registry'

import VaultPage from './overlay/App'
import CaptureBar from './overlay/CaptureBar'

register({
  path: '/vault',
  name: 'Vault',
  component: VaultPage,
  shell: true,
})

register({
  path: '/vault-capture',
  name: 'Save Password',
  component: CaptureBar,
  shell: false,
})
