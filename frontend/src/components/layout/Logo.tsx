import { Hexagon } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-arena border border-cyan-300/30 bg-cyan-400/10 text-cyan-200 shadow-glow">
        <Hexagon className="h-5 w-5" />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-wide">Arena Camp</div>
          <div className="text-[11px] font-semibold uppercase tracking-[.2em] text-arena-muted">Competition Engine</div>
        </div>
      ) : null}
    </div>
  );
}
