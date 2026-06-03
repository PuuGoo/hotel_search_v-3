import { create } from "zustand";

interface ActiveListStore {
  members: string[];
  memberSet: Set<string>;
  add: (id: string) => void;
  remove: (id: string) => void;
  set: (ids: string[]) => void;
}

const useActiveList = create<ActiveListStore>((set, get) => ({
  members: [],
  memberSet: new Set(),
  add: (id) => {
    const { memberSet } = get();
    if (memberSet.has(id)) return;
    const newSet = new Set(memberSet);
    newSet.add(id);
    set({ members: Array.from(newSet), memberSet: newSet });
  },
  remove: (id) => {
    const { memberSet } = get();
    if (!memberSet.has(id)) return;
    const newSet = new Set(memberSet);
    newSet.delete(id);
    set({ members: Array.from(newSet), memberSet: newSet });
  },
  set: (ids) => {
    const newSet = new Set(ids);
    set({ members: ids, memberSet: newSet });
  },
}));

export default useActiveList;
