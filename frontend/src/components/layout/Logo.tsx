import { ArenaMark } from "../brand/ArenaMark";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <ArenaMark size={30} />
      {!compact ? <span className="font-display text-xl font-bold leading-none">Arena Camp</span> : null}
    </div>
  );
}
