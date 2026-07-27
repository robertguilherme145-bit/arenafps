import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "border-arena-line bg-white/[.06] text-arena-muted",
  success: "border-green-500/35 bg-green-500/10 text-green-300",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/35 bg-red-500/10 text-red-300",
  info: "border-cyan-500/35 bg-cyan-500/10 text-cyan-200"
};

export function Badge({
  className,
  children,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
