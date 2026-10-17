import { cn } from "../../utils/cn";

type TabItem<T extends string> = { value: T; label: string; count?: number };

// Abas padrao das paginas: barra ambar embaixo da aba ativa.
export function PageTabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div aria-label={label} className="flex gap-1 overflow-x-auto border-b border-arena-line scrollbar-thin" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.value === value}
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition",
            item.value === value ? "text-arena-text shadow-[inset_0_-3px_0_#ffb020]" : "text-arena-muted hover:text-arena-text"
          )}
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
          {item.count !== undefined ? <span className="rounded-arena bg-arena-panel2 px-1.5 text-xs text-arena-muted">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
