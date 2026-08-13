import { passwordController } from '~/features/vault/controllers/passwordController'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { subWindowService } from '../service'

export const vaultInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.VAULT_LIST]: () => passwordController.list(),
  [IPC_INVOKE_CHANNEL.VAULT_ADD]: (data: any) => passwordController.add(data),
  [IPC_INVOKE_CHANNEL.VAULT_UPDATE]: (data: { id: string; patch: any }) =>
    passwordController.update(data.id, data.patch || {}),
  [IPC_INVOKE_CHANNEL.VAULT_DELETE]: (data: { id: string }) => passwordController.remove(data.id),
  [IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER]: async () => {
    const vaultList = await passwordController.list()
    subWindowService.open('/vault', { items: vaultList })
    return { success: true }
  },
}
