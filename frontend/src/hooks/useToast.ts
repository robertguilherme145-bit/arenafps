import { useToastStore } from "../stores/toastStore";

export function useToast() {
  const push = useToastStore((state) => state.push);

  return {
    info: (title: string, description?: string) => push({ title, description, tone: "info" }),
    success: (title: string, description?: string) => push({ title, description, tone: "success" }),
    warning: (title: string, description?: string) => push({ title, description, tone: "warning" }),
    error: (title: string, description?: string) => push({ title, description, tone: "error" })
  };
}
