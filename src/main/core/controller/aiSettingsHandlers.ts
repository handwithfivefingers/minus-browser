import { aiSettingsController } from '~/main/core/controller/aiSettingsController'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

export const aiSettingsInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.AI_GET_API_KEY]: () => aiSettingsController.getApiKey(),
  [IPC_INVOKE_CHANNEL.AI_SET_API_KEY]: (data: { apiKey?: string }) => {
    aiSettingsController.setApiKey(data?.apiKey || '')
    return { success: true }
  },
  [IPC_INVOKE_CHANNEL.AI_SET_FLOATING_BUTTON]: (data: { show?: boolean }) => {
    aiSettingsController.setShowFloatingButton(data?.show !== false)
    return { success: true }
  },
}
