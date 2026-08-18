import { register } from '~/renderer/sub-window/registry'

import PopupPrompt from './popup/App'

register({
  path: '/popup',
  name: 'Popup Request',
  component: PopupPrompt,
  shell: false,
})
