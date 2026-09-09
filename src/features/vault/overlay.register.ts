import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const VaultPage = lazy(() => import('./overlay/App'))
const CaptureBar = lazy(() => import('./overlay/CaptureBar'))

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
