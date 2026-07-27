import { create } from "zustand";

type ToastTone = "info" | "success" | "warning" | "error";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastState = {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  remove: (id: number) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (toast) =>
    set((state) => ({
      items: [...state.items, { ...toast, id: Date.now() + Math.floor(Math.random() * 1000) }]
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    }))
}));
