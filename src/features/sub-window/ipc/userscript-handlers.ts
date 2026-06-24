import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { userScriptController } from "~/features/userscript/controllers";
import { subWindowService } from "../service";

export const userScriptInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.GET_USERSCRIPTS]: async () => {
    await userScriptController.initialize();
    return userScriptController.listScripts();
  },
  [IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT]: (data: any) => userScriptController.saveScript(data),
  [IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT]: (data: { id: string } | string) =>
    userScriptController.deleteScript(typeof data === "string" ? data : data.id),
  [IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT]: ({ id, enabled }: { id: string; enabled?: boolean }) =>
    userScriptController.toggleScript(id, enabled),
  [IPC_INVOKE_CHANNEL.USERSCRIPT_OPEN_MANAGER]: async () => {
    await userScriptController.initialize();
    const scripts = userScriptController.listScripts();
    subWindowService.open("/userscript", { items: scripts });
    return { success: true };
  },
};
