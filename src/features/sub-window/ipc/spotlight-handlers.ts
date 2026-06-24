import { IPC_INVOKE_CHANNEL, IPC_EMIT_CHANNEL } from "~/shared/constants/ipc";
import { subWindowService } from "../service";

export const spotlightInvokeHandlers = {
  [IPC_INVOKE_CHANNEL.SPOTLIGHT_OPEN]: (data?: { query?: string }) => {
    console.log("spotlightInvokeHandlers SPOTLIGHT_OPEN", data);
    subWindowService.open("/spotlight", data || {});
    return true;
  },
  [IPC_INVOKE_CHANNEL.SPOTLIGHT_CLOSE]: () => {
    console.log("spotlightInvokeHandlers SPOTLIGHT_CLOSE");
    subWindowService.close();
    return true;
  },
};

export const spotlightEmitHandlers = {
  [IPC_EMIT_CHANNEL.SPOTLIGHT_OPEN]: (data?: { query?: string }) => {
    console.log("spotlightEmitHandlers SPOTLIGHT_OPEN", data);
    subWindowService.open("/spotlight", data || {});
  },
  [IPC_EMIT_CHANNEL.SPOTLIGHT_CLOSE]: () => {
    console.log("spotlightInvokeHandlers SPOTLIGHT_CLOSE");
    subWindowService.close();
  },
};
