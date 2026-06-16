import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { SpotlightController } from "./controllers";

export const spotlightController = new SpotlightController();

export const SpotlightRoute = {
  [IPC_INVOKE_CHANNEL.SPOTLIGHT_OPEN]: (data?: { query?: string }) => spotlightController.open(data),
  [IPC_INVOKE_CHANNEL.SPOTLIGHT_CLOSE]: () => spotlightController.close(),
};
