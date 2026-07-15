import { IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_EMIT } from "~/shared/constants/ipc/tabGroup";
import { tabGroupController } from "~/features/tabGroup";
import { subWindowService } from "../service";

export const tabGroupInvokeHandlers = {
  [IPC_TAB_GROUP_INVOKE.CREATE_TAB_GROUP]: (data: { name: string; color?: string; tabIds?: string[] }) =>
    tabGroupController.createGroup(data.name, data.color, data.tabIds),
  [IPC_TAB_GROUP_INVOKE.DELETE_TAB_GROUP]: async (id: string) => {
    await tabGroupController.deleteGroup(id);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.RENAME_TAB_GROUP]: async (data: { id: string; name: string }) => {
    await tabGroupController.renameGroup(data.id, data.name);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.SET_TAB_GROUP_COLOR]: async (data: { id: string; color: string }) => {
    await tabGroupController.setGroupColor(data.id, data.color);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.ADD_TAB_TO_GROUP]: async (data: { groupId: string; tabId: string }) => {
    await tabGroupController.addTabToGroup(data.groupId, data.tabId);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP]: async (data: { groupId: string; tabId: string }) => {
    await tabGroupController.removeTabFromGroup(data.groupId, data.tabId);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.GET_TAB_GROUPS]: () => tabGroupController.getGroups(),
  [IPC_TAB_GROUP_INVOKE.TOGGLE_TAB_GROUP_COLLAPSE]: async (id: string) => {
    await tabGroupController.toggleCollapse(id);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.REORDER_TABS_IN_GROUP]: async (data: { groupId: string; orderedTabIds: string[] }) => {
    await tabGroupController.reorderTabsInGroup(data.groupId, data.orderedTabIds);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.HIDE_GROUP]: async (id: string) => {
    await tabGroupController.hideGroup(id);
    return { success: true };
  },
  [IPC_TAB_GROUP_INVOKE.UNHIDE_GROUP]: async (id: string) => {
    await tabGroupController.unhideGroup(id);
    return { success: true };
  },

  [IPC_TAB_GROUP_INVOKE.OPEN_GROUP_TAB]: async (groupId:string) => {
    await tabGroupController.unhideGroup(groupId);
    return { success: true };
  }
};

export const tabGroupEmitHandlers = {
  [IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU]: (data: any) => {
    subWindowService.open("/tab-context", data);
  },
};
