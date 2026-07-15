import { create } from "zustand";
import { ITabGroup } from "~/shared/types/tab-group";

interface TabGroupStore {
  groups: ITabGroup[];
  setGroups: (groups: ITabGroup[]) => void;
  addGroup: (group: ITabGroup) => void;
  updateGroup: (id: string, changes: Partial<ITabGroup>) => void;
  removeGroup: (id: string) => void;
}

const useTabGroupStore = create<TabGroupStore>((set) => ({
  groups: [],
  setGroups: (groups) => set({ groups }),
  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),
  updateGroup: (id, changes) =>
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, ...changes } : g)),
    })),
  removeGroup: (id) =>
    set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),
}));

export { useTabGroupStore };
