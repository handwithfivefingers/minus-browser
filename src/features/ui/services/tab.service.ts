import { Tab } from "../interfaces";

export const tabServices = {
  getTabs: () => window.api.INVOKE<Tab[]>("GET_TABS"),
  subscribeTab: <T>(id: string, obs: (data: T) => void) =>
    window.api.LISTENER(`FAVICON_UPDATED:${id}`, (data) => obs(data)),
};
