import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "default"
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "default" | "wide";
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/72 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={cn("mx-auto mt-16 w-full rounded-arena border border-arena-line bg-arena-panel shadow-panel", size === "wide" ? "max-w-5xl" : "max-w-lg")}>
        <div className="flex items-start justify-between border-b border-arena-line p-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            {description ? <p className="mt-2 text-sm text-arena-muted">{description}</p> : null}
          </div>
          <button aria-label="Fechar" className="rounded p-1 text-arena-muted transition hover:text-arena-text" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
