import { create } from "zustand";

type Toast = { id: string; kind: "error" | "success" | "info"; message: string };

interface ToastsState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

let seq = 0;
const makeId = (): string => `t_${Date.now().toString(36)}_${(++seq).toString(36)}`;

const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const useToasts = create<ToastsState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = makeId();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    const h = setTimeout(() => {
      timeouts.delete(id);
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 4000);
    timeouts.set(id, h);
  },
  dismiss: (id) => {
    const h = timeouts.get(id);
    if (h) {
      clearTimeout(h);
      timeouts.delete(id);
    }
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));
