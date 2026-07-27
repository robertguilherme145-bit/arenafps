import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-200">{eyebrow}</p> : null}
        <h1 className="mt-2 max-w-4xl font-display text-3xl font-bold leading-tight md:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-arena-muted md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
