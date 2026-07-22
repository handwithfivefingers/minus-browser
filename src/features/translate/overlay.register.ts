import { register } from '~/renderer/sub-window/registry'

import TranslatePage from './overlay/App'

register({
  path: '/translate',
  name: 'Translate',
  component: TranslatePage,
  shell: true,
})
