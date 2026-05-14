import { create } from "zustand";

interface CommandBarState {
  open: boolean;
  query: string;
  setOpen: (v: boolean) => void;
  setQuery: (v: string) => void;
}

export const useCommandBar = create<CommandBarState>((set) => ({
  open: false,
  query: "",
  setOpen: (open) => set({ open }),
  setQuery: (query) => set({ query }),
}));
