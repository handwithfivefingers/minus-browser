import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { translateController } from "~/features/translate/controllers";
import { subWindowService } from "../service";
import { ITranslateSelection } from "~/features/translate/types";

export const translateInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.TRANSLATE_GET_PREFERENCE]: () => translateController.getPreference(),
  [IPC_INVOKE_CHANNEL.TRANSLATE_SAVE_PREFERENCE]: (data: Record<string, any>) =>
    translateController.savePreference(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_DETECT_LANGUAGE]: (data: { text: string }) => translateController.detectLanguage(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_PAGE]: (data: { tabId: string; targetLanguage?: string }) =>
    translateController.translatePage(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_SELECTION]: (data: ITranslateSelection) => translateController.translateSelection(data),
  [IPC_INVOKE_CHANNEL.TRANSLATE_OPEN_MANAGER]: async () => {
    await translateController.initialize();
    const preference = await translateController.getPreference();
    const recentSelections = await translateController.getRecentSelections();
    subWindowService.open("/translate", { preference, recentSelections });
    return { success: true };
  },
  [IPC_INVOKE_CHANNEL.TRANSLATE_GET_SELECTION_HISTORY]: () => translateController.getRecentSelections(),
};
