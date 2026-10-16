import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronRight, Gamepad2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { ActivityFeed } from "../components/broadcast/ActivityFeed";
import { Scoreboard } from "../components/broadcast/Scoreboard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { DataTable } from "../components/ui/DataTable";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { buildActivityFeed } from "../lib/activityFeed";
import { formatPrize } from "../lib/money";
import { getPublicPortal } from "../services/api";
import type { PublicPortalData } from "../types/api";

type PortalTournament = PublicPortalData["tournaments"][number];

const STEPS = ["Criar conta", "Criar equipe", "Inscrever", "Competir", "Ganhar", "Construir histórico"];

export function HomePage() {
  const { user } = useAuth();
  const { error } = useToast();
  const reduceMotion = useReducedMotion();
  const [portal, setPortal] = useState<PublicPortalData | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [rankingTab, setRankingTab] = useState<"players" | "teams">("players");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    void getPublicPortal(gameId)
      .then(setPortal)
      .catch((reason) => error("Falha ao carregar o portal", reason instanceof Error ? reason.message : "Tente novamente."))
      .finally(() => setLoading(false));
  }, [gameId]);

  const upcoming = useMemo(() => (portal?.tournaments ?? []).filter((item) => ["aberto", "criado"].includes(item.status)), [portal]);
  const openTournament = upcoming.find((item) => item.status === "aberto") ?? null;
  const spotlight = portal?.tournaments.find((item) => item.status === "aberto") ?? portal?.tournaments.find((item) => item.status === "em_andamento") ?? upcoming[0] ?? null;
  const feed = useMemo(() => (portal ? buildActivityFeed(portal) : []), [portal]);
  const rankingStarted = Boolean(portal && (portal.players.some((item) => item.matches > 0) || portal.teams.some((item) => item.matches > 0)));
  const rankingStart = upcoming.map((item) => item.inicio).filter(Boolean).sort()[0] ?? null;
  const isLeader = Boolean(user?.roles?.includes("lider"));
  // Sem partida no placar, o campeonato em destaque ja aparece no topo; a secao abaixo mostra so a agenda.
  const heroShowsSpotlight = !portal?.featured_match && Boolean(spotlight);
  const agenda = heroShowsSpotlight ? upcoming : upcoming.filter((item) => item.id !== spotlight?.id);

  return <div className="pb-12">
    <section className="arena-grid border-b border-arena-line bg-[radial-gradient(700px_320px_at_8%_0%,rgba(61,139,255,.16),transparent_60%),radial-gradient(640px_300px_at_95%_0%,rgba(255,176,32,.12),transparent_60%)]">
      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-12 lg:px-8 lg:pt-16">
        <h1 className="max-w-[15ch] font-display text-4xl font-bold leading-[1.05] min-[380px]:text-5xl md:text-6xl">Seu time no servidor. Seu nome no placar.</h1>
        <p className="mt-4 max-w-2xl text-lg text-arena-muted">Campeonatos de FPS com inscrição por PIX, veto de mapas, estatísticas por partida e ranking oficial.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {!user ? <>
            <Link to="/criar-conta"><Button variant="urgent">Inscrever minha equipe</Button></Link>
            <Link to="/torneios"><Button variant="secondary">Ver campeonatos</Button></Link>
          </> : <>
            {isLeader && openTournament ? <Link to={`/torneios/${openTournament.id}`}><Button variant="urgent">Inscrever minha equipe</Button></Link> : null}
            <Link to={roleHref(user.active_role)}><Button variant={isLeader && openTournament ? "secondary" : "primary"}>Abrir meu painel</Button></Link>
            {!isLeader || !openTournament ? <Link to="/torneios"><Button variant="secondary">Ver campeonatos</Button></Link> : null}
          </>}
        </div>
        <div className="mt-9 max-w-4xl">
          {loading ? <Skeleton className="h-28 w-full" /> : portal?.featured_match ? (
            <motion.div animate={{ opacity:1 }} initial={reduceMotion ? false : { opacity:0 }} transition={{ duration:.25 }}>
              <Scoreboard match={portal.featured_match} />
            </motion.div>
          ) : spotlight ? <TournamentSpotlight compact tournament={spotlight} /> : null}
        </div>
      </div>
    </section>

    {portal && portal.games.length > 1 ? <nav aria-label="Filtrar por jogo" className="border-b border-arena-line">
      <div className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 py-3 scrollbar-thin lg:px-8">
        <GameChip active={gameId === null} label="Todos os jogos" onClick={() => setGameId(null)} />
        {portal.games.map((game) => <GameChip active={game.id === gameId} icon={game.logo ? <img alt="" className="h-5 w-5 object-contain" src={game.logo} /> : <Gamepad2 className="h-4 w-4" />} key={game.id} label={game.nome_curto} onClick={() => setGameId(game.id)} />)}
      </div>
    </nav> : null}

    <ActivityFeed items={feed} />

    <main>
      <section className="mx-auto max-w-[1500px] px-4 py-12 lg:px-8">
        <SectionHeading action="Ver todos" href="/torneios" title="Campeonatos" />
        {loading ? <Skeleton className="h-56 w-full" /> : spotlight ? <div className={heroShowsSpotlight ? "" : "grid gap-6 xl:grid-cols-[1.1fr_.9fr]"}>
          {heroShowsSpotlight ? null : <TournamentSpotlight tournament={spotlight} />}
          {agenda.length ? <div className="overflow-hidden border border-arena-line">
            <DataTable data={agenda.slice(0, 6)} columns={[
              { header:"Campeonato", cell:(item) => <Link className="font-semibold hover:text-cyan-200" to={`/torneios/${item.id}`}>{item.nome}</Link> },
              { header:"Início", cell:(item) => date(item.inicio) },
              { header:"Prêmio", cell:(item) => formatPrize(item.premiacao) },
              { header:"Inscrição", cell:(item) => entryFee(item) },
              { header:"Vagas", cell:(item) => `${item.entry_count}/${item.max_teams}` },
              { header:"Situação", cell:(item) => <Badge tone={item.status === "aberto" ? "warning" : "neutral"}>{status(item.status)}</Badge> }
            ]} />
          </div> : heroShowsSpotlight ? <EmptyLine>Novos campeonatos aparecem aqui assim que forem publicados.</EmptyLine> : null}
        </div> : <EmptyLine>Nenhum campeonato publicado ainda. <Link className="font-semibold text-cyan-200" to="/contato">Fale com a organização</Link> para trazer o seu.</EmptyLine>}
      </section>

      <section className="border-y border-arena-line bg-arena-panel2 py-12">
        <div className="mx-auto max-w-[1500px] px-4 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading title="Ranking oficial" />
            {rankingStarted ? <div className="mb-6 flex border border-arena-line p-1" role="tablist">
              {([["players", "Jogadores"], ["teams", "Equipes"]] as const).map(([value, label]) => <button aria-selected={rankingTab === value} className={`px-4 py-1.5 text-sm font-semibold ${rankingTab === value ? "bg-arena-panel text-arena-text" : "text-arena-muted"}`} key={value} onClick={() => setRankingTab(value)} role="tab">{label}</button>)}
            </div> : null}
          </div>
          {loading ? <Skeleton className="h-64 w-full" /> : rankingStarted ? <>
            <div className="overflow-hidden border border-arena-line bg-arena-panel">
              {rankingTab === "players" ? <DataTable data={(portal?.players ?? []).slice(0, 8)} columns={[
                { header:"#", cell:(item) => <span className="font-display text-arena-muted">{(portal?.players.indexOf(item) ?? 0) + 1}</span> },
                { header:"Jogador", cell:(item) => <Link className="font-semibold hover:text-cyan-200" to={`/jogador/${item.nickname || item.id}`}>{item.nickname || item.nick}</Link> },
                { header:"Equipe", cell:(item) => item.team_name },
                { header:"K/D", cell:(item) => <span className="font-display font-semibold text-arena-success">{item.kd}</span> },
                { header:"HS", cell:(item) => `${item.hs_percent}%` },
                { header:"MVP", cell:(item) => item.mvps }
              ]} /> : <DataTable data={(portal?.teams ?? []).slice(0, 8)} columns={[
                { header:"#", cell:(item) => <span className="font-display text-arena-muted">{(portal?.teams.indexOf(item) ?? 0) + 1}</span> },
                { header:"Equipe", cell:(item) => <Link className="font-semibold hover:text-cyan-200" to={`/equipe/${item.slug}`}>{item.nome}</Link> },
                { header:"Partidas", cell:(item) => item.matches },
                { header:"Vitórias", cell:(item) => item.wins },
                { header:"Aproveitamento", cell:(item) => `${item.win_rate}%` }
              ]} />}
            </div>
            <div className="mt-5 flex justify-end"><Link to="/ranking"><Button variant="secondary">Ver ranking completo <ArrowRight className="h-4 w-4" /></Button></Link></div>
          </> : <EmptyLine>{rankingStart ? `O ranking começa na primeira rodada, em ${date(rankingStart)}.` : "O ranking começa na primeira partida oficial."}</EmptyLine>}
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-12 lg:px-8">
        <SectionHeading title="Como funciona" />
        <ol className="grid gap-px border border-arena-line bg-arena-line sm:grid-cols-3 xl:grid-cols-6">
          {STEPS.map((step, index) => <li className="bg-arena-bg p-5" key={step}>
            <span className="font-display text-2xl font-bold text-arena-amber">{index + 1}</span>
            <p className="mt-2 font-semibold">{step}</p>
          </li>)}
        </ol>
      </section>

      {portal?.content.news.length ? <section className="border-y border-arena-line bg-arena-panel2 py-12"><div className="mx-auto max-w-[1500px] px-4 lg:px-8">
        <SectionHeading action="Todas as notícias" href="/noticias" title="Notícias" />
        <div className="grid gap-4 md:grid-cols-3">{portal.content.news.slice(0, 3).map((item) => <article className="border border-arena-line bg-arena-panel p-5" key={item.id}>
          <p className="text-sm text-arena-muted">{date(item.published_at)}</p>
          <h3 className="mt-2 font-display text-xl font-bold">{item.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-arena-muted">{item.subtitle || item.body}</p>
        </article>)}</div>
      </div></section> : null}

      {portal?.content.faq.length || !user ? <section className="mx-auto grid max-w-[1500px] gap-10 px-4 py-12 lg:grid-cols-2 lg:px-8">
        {portal?.content.faq.length ? <div>
          <SectionHeading title="Dúvidas frequentes" />
          <div className="divide-y divide-arena-line border-y border-arena-line">{portal.content.faq.map((item) => <details className="group py-4" key={item.id}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">{item.title}<ChevronRight className="h-4 w-4 transition group-open:rotate-90" /></summary>
            <p className="pt-3 text-sm leading-6 text-arena-muted">{item.body}</p>
          </details>)}</div>
        </div> : <div />}
        {!user ? <div className="border border-arena-line border-t-4 border-t-arena-amber bg-arena-panel p-7 lg:p-10">
          <Trophy className="h-9 w-9 text-arena-amber" />
          <h2 className="mt-6 font-display text-3xl font-bold">Pronto para competir?</h2>
          <p className="mt-3 max-w-lg leading-7 text-arena-muted">Crie sua conta, monte a equipe e transforme cada partida em histórico.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link to="/criar-conta"><Button variant="urgent">Criar conta</Button></Link><Link to="/torneios"><Button variant="secondary">Ver campeonatos</Button></Link></div>
        </div> : null}
      </section> : null}
    </main>

    <footer className="border-t border-arena-line bg-arena-panel2 px-4 py-10 lg:px-8">
      <div className="mx-auto grid max-w-[1500px] gap-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div><p className="font-display text-xl font-bold">Arena Camp</p><p className="mt-3 max-w-sm text-sm leading-6 text-arena-muted">Campeonatos de FPS para equipes e jogadores, do cadastro ao pódio.</p></div>
        <FooterGroup links={[["Campeonatos", "/torneios"], ["Calendário", "/calendario"], ["Resultados", "/resultados"], ["Ranking", "/ranking"]]} title="Competição" />
        <FooterGroup links={[["Equipes", "/equipes"], ["Jogadores", "/jogadores"], ["Notícias", "/noticias"], ["Jogos", "/jogos"]]} title="Comunidade" />
        <FooterGroup links={[["Sobre", "/sobre"], ["Dúvidas frequentes", "/faq"], ["Contato", "/contato"], ["Privacidade", "/privacidade"], ["Termos", "/termos"]]} title="Arena Camp" />
      </div>
      <p className="mx-auto mt-8 max-w-[1500px] border-t border-arena-line pt-5 text-xs text-arena-muted">© {new Date().getFullYear()} Arena Camp</p>
    </footer>
  </div>;
}

function TournamentSpotlight({ tournament, compact = false }: { tournament: PortalTournament; compact?: boolean }) {
  const filled = tournament.max_teams ? Math.min(100, Math.round((tournament.entry_count / tournament.max_teams) * 100)) : 0;
  return <Link className="chamfer block border border-arena-line bg-arena-panel p-5 transition hover:border-arena-muted" to={`/torneios/${tournament.id}`}>
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={tournament.status === "aberto" ? "warning" : tournament.status === "em_andamento" ? "live" : "neutral"}>{status(tournament.status)}</Badge>
      <span className="text-sm text-arena-muted">{tournament.game_short_name}</span>
    </div>
    <h3 className={`mt-3 font-display font-bold leading-tight ${compact ? "text-2xl" : "text-3xl"}`}>{tournament.nome}</h3>
    <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Fact label="Prêmio" value={formatPrize(tournament.premiacao)} />
      <Fact label="Inscrição" value={entryFee(tournament)} />
      <Fact label="Formato" value={format(tournament.format)} />
      <Fact label="Início" value={date(tournament.inicio)} />
    </dl>
    {tournament.max_teams ? <div className="mt-4">
      <p className="text-sm text-arena-muted">{tournament.entry_count} de {tournament.max_teams} vagas preenchidas</p>
      <div className="mt-2 h-2 bg-arena-line"><div className="h-full bg-arena-amber" style={{ width:`${filled}%` }} /></div>
    </div> : null}
    {!compact && tournament.status === "aberto" ? <span className="chamfer mt-5 inline-flex h-10 items-center bg-arena-amber px-4 text-sm font-bold text-arena-ink">Inscrever equipe</span> : null}
  </Link>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-t-2 border-arena-line pt-2"><dt className="text-xs text-arena-muted">{label}</dt><dd className="font-display text-lg font-semibold leading-snug">{value}</dd></div>;
}
function GameChip({ active, label, icon, onClick }: { active: boolean; label: string; icon?: ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={`flex shrink-0 items-center gap-2 border px-3 py-1.5 text-sm font-semibold ${active ? "border-arena-blue bg-arena-blue/10 text-arena-text" : "border-arena-line text-arena-muted hover:text-arena-text"}`} onClick={onClick}>{icon}{label}</button>;
}
function SectionHeading({ title, action, href }: { title: string; action?: string; href?: string }) {
  return <div className="mb-6 flex items-end justify-between gap-4"><h2 className="font-display text-3xl font-bold">{title}</h2>{action && href ? <Link className="hidden items-center gap-2 text-sm font-semibold text-cyan-200 sm:flex" to={href}>{action}<ArrowRight className="h-4 w-4" /></Link> : null}</div>;
}
function FooterGroup({ title, links }: { title: string; links: string[][] }) {
  return <div><p className="font-semibold">{title}</p><div className="mt-4 space-y-2">{links.map(([label, href]) => <Link className="block text-sm text-arena-muted hover:text-arena-text" key={href} to={href}>{label}</Link>)}</div></div>;
}
function EmptyLine({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-arena-line p-8 text-center text-arena-muted">{children}</div>;
}
function status(value: string) { return ({ criado:"Em preparação", aberto:"Inscrições abertas", fechado:"Inscrições encerradas", em_andamento:"Em andamento", finalizado:"Finalizado", cancelado:"Cancelado" } as Record<string, string>)[value] ?? value; }
function format(value: string | null) { return ({ mix_single_elimination:"Mix individual", single_elimination:"Eliminação simples", double_elimination:"Eliminação dupla", swiss:"Sistema suíço", round_robin:"Pontos corridos", group_playoffs:"Grupos e playoffs", league:"Liga", custom:"Personalizado" } as Record<string, string>)[value ?? ""] ?? "A definir"; }
function entryFee(tournament: { valor?: string | number | null; format?: string | null }) { const amount = Number(String(tournament.valor ?? 0).replace(/[^\d,.-]/g, "").replace(",", ".")); if (!Number.isFinite(amount) || amount <= 0) return "Grátis"; const scope = tournament.format === "mix_single_elimination" ? "por jogador" : "por equipe"; return `${new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(amount)} ${scope}`; }
function date(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString("pt-BR") : "A definir"; }
function roleHref(role?: string | null) { return role === "admin" ? "/admin" : role === "lider" ? "/lider" : role === "capitao" ? "/capitao" : "/jogador"; }
