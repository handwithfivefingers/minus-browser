import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { History } from "./historyController";

const historyController = new History();
export { historyController };

export const HistoryRoute: Record<string, Function> = {
  [IPC_INVOKE_CHANNEL.GET_HISTORY]: () => historyController.getAll(),
  [IPC_INVOKE_CHANNEL.SEARCH_HISTORY]: (query: string) => historyController.search(query),
  [IPC_INVOKE_CHANNEL.DELETE_HISTORY]: (id: string) => historyController.deleteEntry(id),
  [IPC_INVOKE_CHANNEL.CLEAR_HISTORY]: () => historyController.clearAll(),
  [IPC_INVOKE_CHANNEL.GET_RECENT_HISTORY]: (limit: number) => historyController.getRecent(limit),
};
