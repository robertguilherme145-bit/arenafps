import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "live";

const tones: Record<BadgeTone, string> = {
  neutral: "border-arena-line bg-arena-panel2 text-arena-muted",
  success: "border-arena-success/45 bg-arena-success/10 text-arena-success",
  warning: "border-arena-amber/50 bg-arena-amber/10 text-arena-amber",
  danger: "border-arena-danger/50 bg-arena-danger/10 text-[#ff8a96]",
  info: "border-arena-blue/50 bg-arena-blue/10 text-cyan-200",
  live: "border-arena-live/60 bg-arena-live/10 text-[#ff8a96]"
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
        "inline-flex h-7 items-center gap-2 rounded-arena border px-2.5 text-xs font-bold",
        tones[tone],
        className
      )}
      {...props}
    >
      {tone === "live" ? <span aria-hidden="true" className="live-dot" /> : null}
      {children}
    </span>
  );
}
