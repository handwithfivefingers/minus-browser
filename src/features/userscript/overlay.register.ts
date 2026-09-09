import { lazy } from 'react'

import { register } from '~/renderer/sub-window/registry'

const UserscriptPage = lazy(() => import('./overlay/App'))

register({
  path: '/userscript',
  name: 'UserScript',
  component: UserscriptPage,
  shell: true,
})
