import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useToastStore } from "../../stores/toastStore";

const toneMap = {
  info: {
    icon: Info,
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
  },
  success: {
    icon: CheckCircle2,
    className: "border-green-500/35 bg-green-500/10 text-green-100"
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-500/35 bg-amber-500/10 text-amber-100"
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/35 bg-red-500/10 text-red-100"
  }
} as const;

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);

  useEffect(() => {
    const timers = items.map((item) =>
      window.setTimeout(() => {
        remove(item.id);
      }, 3500)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, remove]);

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(380px,calc(100vw-32px))] flex-col gap-3">
      {items.map((item) => {
        const tone = toneMap[item.tone];
        const Icon = tone.icon;

        return (
          <div
            className={cn(
              "rounded-arena border px-4 py-3 shadow-panel backdrop-blur",
              tone.className
            )}
            key={item.id}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? <p className="mt-1 text-sm opacity-85">{item.description}</p> : null}
              </div>
              <button
                aria-label="Fechar aviso"
                className="rounded p-1 opacity-70 transition hover:opacity-100"
                onClick={() => remove(item.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
