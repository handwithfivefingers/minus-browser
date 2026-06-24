import { v7 as uuid_v7 } from "uuid";
import { cacheSystem } from "~/features/cacheSystem";
import { StoreManager } from "~/core/stores";
import { ITabGroup } from "~/shared/types/tab-group";

export class TabGroupController {
  groups: Map<string, ITabGroup> = new Map();
  private groupStore: StoreManager = new StoreManager("userData");
  onChanged?: () => void;

  async initialize() {
    try {
      const data = await cacheSystem.get<{ tabGroups: ITabGroup[] }>("tabGroups", async () => {
        const stored = await this.groupStore.readFiles<{ tabGroups?: ITabGroup[] }>();
        return { tabGroups: stored?.tabGroups || [] };
      });
      if (data?.tabGroups) {
        for (const group of data.tabGroups) {
          this.groups.set(group.id, group);
        }
      }
    } catch {
      console.error("Failed to initialize TabGroupController");
    }
  }

  async createGroup(name: string, color?: string, tabIds?: string[]): Promise<ITabGroup> {
    const now = Date.now();
    const group: ITabGroup = {
      id: uuid_v7(),
      name,
      color: color || "#6366f1",
      tabIds: tabIds || [],
      hidden: false,
      collapsed: false,
      createdAt: now,
      updatedAt: now,
    };
    this.groups.set(group.id, group);
    await this.syncCache();
    return group;
  }

  async deleteGroup(id: string) {
    this.groups.delete(id);
    await this.syncCache();
  }

  async renameGroup(id: string, name: string) {
    const group = this.groups.get(id);
    if (!group) return;
    group.name = name;
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  async setGroupColor(id: string, color: string) {
    const group = this.groups.get(id);
    if (!group) return;
    group.color = color;
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  async addTabToGroup(groupId: string, tabId: string) {
    const group = this.groups.get(groupId);
    if (!group) return;
    if (!group.tabIds.includes(tabId)) {
      group.tabIds.push(tabId);
    }
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  async removeTabFromGroup(groupId: string, tabId: string) {
    const group = this.groups.get(groupId);
    if (!group) return;
    group.tabIds = group.tabIds.filter((id) => id !== tabId);
    group.updatedAt = Date.now();
    if (group.tabIds.length === 0) {
      this.groups.delete(groupId);
    }
    await this.syncCache();
  }

  async removeTabFromGroupByTabId(tabId: string) {
    const group = this.getGroupByTabId(tabId);
    if (!group) return;
    await this.removeTabFromGroup(group.id, tabId);
  }

  getGroupByTabId(tabId: string): ITabGroup | undefined {
    for (const [, group] of this.groups) {
      if (group.tabIds.includes(tabId)) {
        return group;
      }
    }
    return undefined;
  }
  getGroupTabIds(groupId: string): string[] | undefined {
    const group = this.groups.get(groupId);
    return group?.tabIds;
  }

  async hideGroup(id: string) {
    const group = this.groups.get(id);
    if (!group) return;
    group.hidden = true;
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  async unhideGroup(id: string) {
    const group = this.groups.get(id);
    if (!group) return;
    group.hidden = false;
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  getGroups(): ITabGroup[] {
    return [...this.groups.values()];
  }

  async toggleCollapse(id: string) {
    const group = this.groups.get(id);
    if (!group) return;
    group.collapsed = !group.collapsed;
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  async reorderTabsInGroup(groupId: string, orderedTabIds: string[]) {
    const group = this.groups.get(groupId);
    if (!group) return;
    group.tabIds = orderedTabIds.filter((id) => group.tabIds.includes(id));
    group.updatedAt = Date.now();
    await this.syncCache();
  }

  private async syncCache() {
    const groups = this.getGroups();
    cacheSystem.set("tabGroups", { tabGroups: groups });
    await this.groupStore.saveFiles({ tabGroups: groups });
    this.onChanged?.();
  }

  destroy() {
    this.groups.clear();
  }
}
const tabGroupController = new TabGroupController();

export { tabGroupController };
