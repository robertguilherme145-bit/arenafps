import type { ReactNode } from "react";
import { Card, CardContent } from "./Card";

export function StatCard({ label, value, icon, helper }: { label: string; value: string; icon: ReactNode; helper?: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-arena-muted">{label}</p>
          <p className="mt-3 font-display text-3xl font-bold">{value}</p>
          {helper ? <p className="mt-2 text-sm text-arena-muted">{helper}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-arena border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
