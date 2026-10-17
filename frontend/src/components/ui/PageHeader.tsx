import type { ReactNode } from "react";

// Cabecalho padrao de pagina: titulo, uma linha de descricao e acoes a direita.
// "eyebrow" continua aceito por compatibilidade, mas nao e mais exibido (era um rotulo em caixa alta repetitivo).
export function PageHeader({ title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-arena-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
