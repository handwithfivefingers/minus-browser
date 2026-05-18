import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { userScriptController } from "./controllers";
import { IUserScript } from "./types";

export const UserScriptRoute = {
  [IPC_INVOKE_CHANNEL.GET_USERSCRIPTS]: async () => {
    await userScriptController.initialize();
    return userScriptController.listScripts();
  },
  [IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT]: (data: IUserScript) => userScriptController.saveScript(data),
  [IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT]: (data: { id: string } | string) =>
    userScriptController.deleteScript(typeof data === "string" ? data : data.id),
  [IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT]: ({ id, enabled }: { id: string; enabled?: boolean }) =>
    userScriptController.toggleScript(id, enabled),
  [IPC_INVOKE_CHANNEL.USERSCRIPT_OPEN_MANAGER]: () => userScriptController.openManager(),

  // [IPC_INVOKE_CHANNEL.IMPORT_USERSCRIPT]: () => this.importUserScript(),
};
