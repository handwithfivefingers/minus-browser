import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { VaultController } from "./controllers";
import { Vault, VaultUpdateParams } from "./types";

const vaultController = new VaultController();
export const VaultRoute = {
  [IPC_INVOKE_CHANNEL.VAULT_LIST]: () => vaultController.getVaults(),
  [IPC_INVOKE_CHANNEL.VAULT_ADD]: (data: Vault) => vaultController.addVault(data),
  [IPC_INVOKE_CHANNEL.VAULT_UPDATE]: (data: VaultUpdateParams) => {
    return vaultController.updateVault(data.id, data.patch || {});
  },
  [IPC_INVOKE_CHANNEL.VAULT_DELETE]: (data: { id: string }) => vaultController.removeVault(data.id),
  [IPC_INVOKE_CHANNEL.VAULT_FILL]: (data: { credentialId: string }) => vaultController.fill(data),
  [IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER]: ({ tabId }: { tabId: string }) => vaultController.openManager(tabId),
  [IPC_INVOKE_CHANNEL.VAULT_CONFIRM_SAVE]: (data: { username: string; site: string; tabId?: string }) =>
    vaultController.vaultConfirmSave(data),
  [IPC_INVOKE_CHANNEL.VAULT_SELECT_CREDENTIAL]: (data: any) => vaultController.vaultSelectCredential(data),
};
