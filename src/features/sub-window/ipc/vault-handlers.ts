import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { PasswordController } from "~/features/vault/controllers/passwordController";
import { VaultController } from "~/features/vault/controllers";
import { subWindowService } from "../service";

const passwordController = new PasswordController();
const vaultController = new VaultController();

export const vaultInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.VAULT_LIST]: () => passwordController.list(),
  [IPC_INVOKE_CHANNEL.VAULT_ADD]: (data: any) => passwordController.add(data),
  [IPC_INVOKE_CHANNEL.VAULT_UPDATE]: (data: { id: string; patch: any }) =>
    passwordController.update(data.id, data.patch || {}),
  [IPC_INVOKE_CHANNEL.VAULT_DELETE]: (data: { id: string }) => passwordController.remove(data.id),
  [IPC_INVOKE_CHANNEL.VAULT_FILL]: (data: { credentialId: string }) => vaultController.fill(data),
  [IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER]: async () => {
    const vaultList = await passwordController.list();
    subWindowService.open("/vault", { items: vaultList });
    return { success: true };
  },
  [IPC_INVOKE_CHANNEL.VAULT_CONFIRM_SAVE]: (data: { username: string; site: string; tabId?: string }) =>
    vaultController.vaultConfirmSave(data),
  [IPC_INVOKE_CHANNEL.VAULT_SELECT_CREDENTIAL]: (data: any) => vaultController.vaultSelectCredential(data),
};
