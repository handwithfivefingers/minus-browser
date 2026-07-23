import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { subWindowService } from '../service'

type SpotlightOpenPayload = {
  query?: string
  activeTabId?: string
}

export const spotlightInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.SPOTLIGHT_OPEN]: (data?: SpotlightOpenPayload) => {
    subWindowService.open('/spotlight', data || {})
    return true
  },
  [IPC_INVOKE_CHANNEL.SPOTLIGHT_CLOSE]: () => {
    subWindowService.close()
    return true
  },
}
