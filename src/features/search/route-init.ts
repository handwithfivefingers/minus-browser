import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { searchController } from "./controllers";

export const SearchRoute = {
  [IPC_INVOKE_CHANNEL.SEARCH_PAGE]: (data: {
    data?: string;
    query?: string;
    forward?: boolean;
    findNext?: boolean;
    matchCase?: boolean;
  } = {}) =>
    searchController.searchPage({
      ...data,
      query: data?.query || data?.data || "",
    }),
  [IPC_INVOKE_CHANNEL.STOP_SEARCH]: () => searchController.stopSearch(),
};
