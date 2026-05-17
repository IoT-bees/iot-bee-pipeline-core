import { create } from "zustand";

interface CommandBarState {
  open: boolean;
  query: string;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  setQuery: (v: string) => void;
}

export const useCommandBar = create<CommandBarState>((set) => ({
  open: false,
  query: "",
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setQuery: (query) => set({ query }),
}));
