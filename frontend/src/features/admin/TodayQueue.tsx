import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { getAdminToday, type AdminTodayItem } from "../../services/api";
import { cn } from "../../utils/cn";

const SEVERITY: Record<AdminTodayItem["severity"], { label: string; className: string }> = {
  alta:{ label:"Urgente", className:"border-l-arena-live" },
  media:{ label:"Hoje", className:"border-l-arena-amber" },
  baixa:{ label:"Quando puder", className:"border-l-arena-line" }
};

// Fila "Hoje": so o que pede acao, cada item com o botao que resolve, e os numeros do dia.
export function TodayQueue() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey:["admin-today"], queryFn:getAdminToday, refetchInterval:60_000 });

  if (isLoading) return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-4">{Array.from({ length:4 }, (_, index) => <Skeleton className="h-20" key={index} />)}</div><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      {data ? (
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Partidas hoje" value={String(data.numbers.matches_today)} />
          <Stat label="Ao vivo agora" value={String(data.numbers.live_matches)} />
          <Stat label="Inscrições hoje" value={String(data.numbers.registrations_today)} />
          <Stat label="Recebido hoje" value={data.numbers.revenue_today.toLocaleString("pt-BR", { style:"currency", currency:"BRL" })} />
        </dl>
      ) : null}

      <section className="border border-arena-line bg-arena-panel">
        <header className="flex items-center justify-between gap-3 border-b border-arena-line px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Precisa de você</h2>
            <p className="text-sm text-arena-muted">Atualiza sozinho a cada minuto.</p>
          </div>
          <Button aria-label="Atualizar a fila" className="h-10 w-10 px-0" icon={<RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />} onClick={() => void refetch()} variant="ghost" />
        </header>
        {isError ? (
          <p className="px-5 py-8 text-sm text-arena-muted">Não foi possível carregar a fila agora. Tente atualizar.</p>
        ) : data && data.items.length ? (
          <ul className="divide-y divide-arena-line">
            {data.items.map((item) => (
              <li className={cn("flex flex-col gap-3 border-l-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between", SEVERITY[item.severity].className)} key={item.key}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-arena-muted">{SEVERITY[item.severity].label}</p>
                  <p className="mt-1 font-semibold">{item.title}</p>
                  <p className="text-sm text-arena-muted">{item.detail}</p>
                </div>
                <Link className="shrink-0" to={item.href}><Button icon={<ChevronRight className="h-4 w-4" />} variant={item.severity === "alta" ? "urgent" : "secondary"}>{item.action}</Button></Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-arena-success" />
            <p className="mt-3 font-semibold">Tudo em dia</p>
            <p className="mt-1 text-sm text-arena-muted">Nenhuma disputa, pagamento parado, partida sem sala ou chamado esperando.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border border-arena-line bg-arena-panel px-4 py-3"><dt className="text-xs font-semibold uppercase text-arena-muted">{label}</dt><dd className="mt-1 font-display text-2xl font-semibold">{value}</dd></div>;
}
