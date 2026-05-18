import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { translateController } from "./controllers";
import { ITranslateSelection } from "./types";

export const TranslateRoute = {
  [IPC_INVOKE_CHANNEL.TRANSLATE_GET_PREFERENCE]: () => translateController.getPreference(),
  [IPC_INVOKE_CHANNEL.TRANSLATE_SAVE_PREFERENCE]: (data: Record<string, any>) =>
    translateController.savePreference(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_DETECT_LANGUAGE]: (data: { text: string }) => translateController.detectLanguage(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_PAGE]: (data: { tabId: string; targetLanguage?: string }) =>
    translateController.translatePage(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_SELECTION]: (data: ITranslateSelection) => translateController.translateSelection(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_OPEN_MANAGER]: () => translateController.openManager(),
  [IPC_INVOKE_CHANNEL.TRANSLATE_GET_SELECTION_HISTORY]: () => translateController.getRecentSelections(),
};
