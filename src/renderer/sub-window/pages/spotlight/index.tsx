import { register } from '~/renderer/sub-window/registry'

import { SpotlightComponent } from '../../components/spotlight'

register({
  path: '/spotlight',
  name: 'Spotlight',
  shell: false,
  component: SpotlightComponent,
})
