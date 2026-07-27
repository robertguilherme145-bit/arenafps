import { cn } from "../../utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-arena bg-white/[.08]", className)} />;
}
