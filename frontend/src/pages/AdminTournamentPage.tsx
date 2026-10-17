import { Check, Circle, Copy, ExternalLink, ListChecks, Swords, Users, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { TournamentStatusBadge } from "../components/ui/StatusBadge";
import { TournamentStreamField } from "../features/admin/TournamentStreamField";
import { useToast } from "../hooks/useToast";
import {
  drawAdminMixTournament,
  duplicateAdminTournament,
  generateTournamentStructure,
  getAdminTournamentOverview,
  updateTournamentStatus,
  type AdminTournamentOverview
} from "../services/api";
import { cn } from "../utils/cn";

// Pagina do torneio no painel: etapa atual, a unica proxima acao, checklist de publicacao e atalhos.
export function AdminTournamentPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [overview, setOverview] = useState<AdminTournamentOverview | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await getAdminTournamentOverview(id));
      setFailed(null);
    } catch (reason) {
      setFailed(reason instanceof Error ? reason.message : "Não foi possível carregar o torneio.");
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function run(key: string, action: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await action();
      success(done, "A página foi atualizada.");
      await load();
    } catch (reason) {
      error("Não foi possível concluir", reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  if (failed) return <section className="mx-auto max-w-[1200px] px-4 py-10 lg:px-8"><EmptyState title="Torneio não encontrado" description={failed} action={<Link to="/admin?module=competitions"><Button variant="secondary">Voltar para Torneios</Button></Link>} /></section>;
  if (!overview) return <section className="mx-auto max-w-[1200px] space-y-4 px-4 py-10 lg:px-8"><Skeleton className="h-16" /><Skeleton className="h-28" /><Skeleton className="h-64" /></section>;

  const { tournament, nextAction } = overview;
  const required = overview.checklist.filter((item) => item.required);
  const blocked = nextAction?.key === "publish" && !overview.ready;

  function doNextAction() {
    if (!nextAction) return;
    if (nextAction.key === "manual" && nextAction.href) { navigate(nextAction.href); return; }
    if (nextAction.key === "structure") return void run("next", () => generateTournamentStructure(id), "Chave gerada");
    if (nextAction.key === "draw") return void run("next", () => drawAdminMixTournament(id), "Equipes sorteadas");
    if (nextAction.status) return void run("next", () => updateTournamentStatus(id, nextAction.status!), nextAction.key === "publish" ? "Torneio publicado" : "Etapa concluída");
  }

  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-12 lg:px-8">
      <PageHeader
        title={tournament.nome}
        description={overview.kind === "mix" ? "Torneio Mix: os jogadores se inscrevem sozinhos e as equipes são sorteadas." : "Tudo deste torneio num só lugar."}
        action={<>
          <TournamentStatusBadge status={tournament.status} />
          {tournament.status !== "criado" ? <Link to={`/torneios/${id}`}><Button icon={<ExternalLink className="h-4 w-4" />} variant="secondary">Ver página pública</Button></Link> : null}
          <Button icon={<Copy className="h-4 w-4" />} loading={busy === "duplicate"} onClick={() => void (async () => { setBusy("duplicate"); try { const copy = await duplicateAdminTournament(id); success("Cópia criada", "Revise as datas antes de publicar."); navigate(`/admin/torneios/${copy.id}`); } catch (reason) { error("Não foi possível duplicar", reason instanceof Error ? reason.message : "Tente novamente."); } finally { setBusy(null); } })()} variant="secondary">Duplicar</Button>
        </>}
      />

      <ol aria-label="Etapas do torneio" className="grid gap-1 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {overview.stages.map((stage, index) => (
          <li className={cn("border-t-4 bg-arena-panel px-3 py-2 text-sm", stage.state === "atual" ? "border-arena-amber text-arena-text" : stage.state === "feito" ? "border-arena-success text-arena-muted" : "border-arena-line text-arena-muted")} key={stage.key}>
            <span className="block text-xs">Etapa {index + 1}</span>
            <span className="font-semibold">{stage.label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="border border-arena-line border-t-4 border-t-arena-amber bg-arena-panel p-5">
            <h2 className="font-display text-xl font-semibold">Próximo passo</h2>
            {nextAction ? <>
              <Button className="mt-4" disabled={blocked} loading={busy === "next"} onClick={doNextAction} variant={nextAction.key === "publish" || nextAction.key === "start" ? "urgent" : "primary"}>{nextAction.label}</Button>
              {blocked ? <p className="mt-3 text-sm text-arena-amber">Complete os itens obrigatórios da lista para publicar.</p> : null}
            </> : null}
            {overview.note ? <p className="mt-3 text-sm text-arena-muted">{overview.note}</p> : null}
          </section>

          <section className="border border-arena-line bg-arena-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><ListChecks className="h-5 w-5 text-cyan-200" />Lista para publicar</h2>
            <p className="mt-1 text-sm text-arena-muted">{required.filter((item) => item.done).length} de {required.length} itens obrigatórios completos.</p>
            <ul className="mt-4 divide-y divide-arena-line">
              {overview.checklist.map((item) => (
                <li className="flex items-start gap-3 py-3" key={item.key}>
                  {item.done ? <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-arena-success" /> : <Circle aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", item.required ? "text-arena-amber" : "text-arena-muted")} />}
                  <div>
                    <p className="font-semibold">{item.label} {item.required ? null : <span className="text-xs font-normal text-arena-muted">(opcional)</span>}</p>
                    {!item.done ? <p className="text-sm text-arena-muted">{item.hint}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            <Link className="mt-2 inline-block text-sm font-semibold text-cyan-200 hover:text-cyan-100" to={`/admin?module=competitions&torneio=${id}`}>Editar configurações do torneio</Link>
          </section>

          <TournamentStreamField initialUrl={tournament.stream_url} tournamentId={id} />
        </div>

        <aside className="space-y-4">
          <section className="border border-arena-line bg-arena-panel p-5">
            <h2 className="font-display text-lg font-semibold">Resumo</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Inscrições" value={`${overview.entries.total} de ${tournament.max_teams}`} />
              <Row label="Confirmadas" value={String(overview.entries.confirmed)} />
              <Row label="Sem pagamento" value={String(overview.entries.pending_payment)} />
              <Row label="Partidas" value={String(overview.matchCount)} />
              <Row label="Inscrições até" value={overview.settings?.registration_closes_at ? new Date(overview.settings.registration_closes_at).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }) : "Sem prazo automático"} />
              <Row label="Início" value={tournament.inicio ? new Date(tournament.inicio).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }) : "A definir"} />
            </dl>
          </section>
          <nav aria-label="Atalhos" className="border border-arena-line bg-arena-panel p-2">
            <Shortcut href={`/admin?module=competitions&torneio=${id}`} icon={<Users className="h-4 w-4" />} label="Inscrições e pagamentos" />
            <Shortcut href="/admin?module=operations" icon={<Swords className="h-4 w-4" />} label="Partidas, salas e veto" />
          </nav>
          {tournament.status !== "cancelado" && tournament.status !== "finalizado" && tournament.status !== "em_andamento" ? (
            <Button className="w-full" icon={<XCircle className="h-4 w-4" />} loading={busy === "cancel"} onClick={() => { if (window.confirm(`Cancelar "${tournament.nome}"? Esta ação não pode ser desfeita.`)) void run("cancel", () => updateTournamentStatus(id, "cancelado"), "Torneio cancelado"); }} variant="ghost">Cancelar torneio</Button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-arena-muted">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}

function Shortcut({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-arena-muted hover:bg-arena-panel2 hover:text-arena-text" to={href}>{icon}{label}</Link>;
}
