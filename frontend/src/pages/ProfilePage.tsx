import { CalendarDays, Crosshair, Gamepad2, Medal, Share2, Shield, Trophy, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/ui/StatCard";
import { useToast } from "../hooks/useToast";
import { getPublicPlayerProfile, getPublicTeamProfile } from "../services/api";
import type { PlayerPublicProfile, PublicTeamProfile as PublicTeamProfileData } from "../types/api";

export function ProfilePage({ type }: { type: "equipe" | "jogador" }) {
  const { slug = "" } = useParams();
  return type === "jogador" ? <PublicPlayerProfile slug={slug} /> : <PublicTeamProfile slug={slug} />;
}

function PublicPlayerProfile({ slug }: { slug: string }) {
  const toast = useToast();
  const [data, setData] = useState<PlayerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    void getPublicPlayerProfile(slug).then(setData).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);
  async function share() {
    const payload = { title: `${data?.profile.nickname} na Arena Camp`, text: "Confira este perfil competitivo na Arena Camp.", url: window.location.href };
    if (navigator.share) await navigator.share(payload);
    else { await navigator.clipboard.writeText(payload.url); toast.success("Link copiado", "O perfil está pronto para compartilhar."); }
  }
  if (loading) return <section className="space-y-5 px-4 py-8 lg:px-8"><Skeleton className="h-52" /><Skeleton className="h-32" /><Skeleton className="h-96" /></section>;
  if (notFound || !data) return <section className="px-4 py-12 lg:px-8"><EmptyState title="Perfil indisponivel" description="O jogador não existe ou escolheu manter a carreira privada." /></section>;
  const stats = data.career.totals;
  return <section className="px-4 pb-12 lg:px-8">
    <div className="relative -mx-4 h-56 overflow-hidden border-b border-arena-line bg-[linear-gradient(120deg,#071b2a,#151127)] lg:-mx-8">{data.profile.banner ? <img alt="Banner competitivo" className="h-full w-full object-cover" src={data.profile.banner} /> : null}<div className="absolute inset-0 bg-gradient-to-t from-arena-bg via-transparent to-transparent" /></div>
    <div className="relative -mt-16 mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="flex items-end gap-4"><div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border-2 border-cyan-300 bg-arena-panel">{data.profile.avatar ? <img alt={data.profile.nickname} className="h-full w-full object-cover" src={data.profile.avatar} /> : <UserRound className="h-11 w-11 text-cyan-200" />}</div><div className="pb-1"><p className="text-xs font-semibold uppercase text-cyan-200">Carreira competitiva</p><h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{data.profile.nickname}</h1><p className="mt-1 text-sm text-arena-muted">{[data.profile.cidade, data.profile.estado, data.profile.pais].filter(Boolean).join(", ") || "Arena Camp"}</p></div></div><Button variant="secondary" icon={<Share2 className="h-4 w-4" />} onClick={() => void share()}>Compartilhar perfil</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Ranking geral" value={stats.global_rank ? `#${stats.global_rank}` : "Sem posição"} helper={`Nivel ${data.career.level} · ${data.career.xp} XP`} icon={<Medal className="h-5 w-5" />} /><StatCard label="K/D" value={decimal(stats.kd)} helper={`${stats.kills} kills · ${stats.deaths} deaths`} icon={<Crosshair className="h-5 w-5" />} /><StatCard label="Win rate" value={`${decimal(stats.win_rate)}%`} helper={`${stats.wins} V · ${stats.losses} D`} icon={<Trophy className="h-5 w-5" />} /><StatCard label="Partidas" value={String(stats.matches)} helper={`${stats.mvps} MVPs · ${decimal(stats.hs_percent)}% HS`} icon={<CalendarDays className="h-5 w-5" />} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><div className="space-y-5"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Sobre</h2></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-arena-muted">{data.profile.bio || "Jogador competitivo da Arena Camp."}</p>{data.current_team ? <Link className="mt-5 flex items-center gap-3 border border-arena-line p-3 transition hover:bg-white/[.04]" to={`/equipe/${data.current_team.team_slug}`}><Shield className="h-5 w-5 text-cyan-200" /><div><p className="font-semibold">{data.current_team.team_name}</p><p className="text-xs text-arena-muted">{data.current_team.game_name} · {data.current_team.lineup_status}</p></div></Link> : null}</CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Jogos</h2></CardHeader><CardContent className="space-y-3">{data.games.map((game) => <div className="flex items-center justify-between border border-arena-line p-3" key={game.game_id}><div className="flex items-center gap-3"><Gamepad2 className="h-5 w-5 text-cyan-200" /><div><p className="font-semibold">{game.nome}</p><p className="text-xs text-arena-muted">{game.nickname} · {game.game_player_id}</p></div></div><Badge>{game.rank_name || "Sem rank"}</Badge></div>)}{!data.games.length ? <p className="text-sm text-arena-muted">Nenhum jogo público vinculado.</p> : null}</CardContent></Card></div>
      <div className="space-y-5"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Conquistas</h2></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{data.career.achievements.map((achievement) => <div className={`border p-4 ${achievement.unlocked ? "border-cyan-400/40 bg-cyan-400/10" : "border-arena-line opacity-60"}`} key={achievement.code}><div className="flex items-center justify-between"><Trophy className="h-5 w-5 text-cyan-200" /><Badge tone={achievement.unlocked ? "success" : "neutral"}>{achievement.unlocked ? "Conquistada" : `${achievement.progress}/${achievement.target}`}</Badge></div><p className="mt-3 font-semibold">{achievement.title}</p><p className="mt-1 text-sm text-arena-muted">{achievement.description}</p></div>)}</CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Histórico recente</h2></CardHeader><CardContent className="space-y-3">{data.career.history.slice(0, 12).map((match) => <div className="flex items-center justify-between gap-3 border border-arena-line p-3" key={match.id}><div><p className="font-semibold">{match.team_name} vs {match.opponent}</p><p className="text-xs text-arena-muted">{match.tournament_name} · {match.maps || "Mapa não informado"}</p></div><div className="text-right"><Badge tone={match.won ? "success" : "danger"}>{match.won ? "Vitoria" : "Derrota"}</Badge><p className="mt-1 text-xs text-arena-muted">{match.kills}/{match.deaths}/{match.assists}</p></div></div>)}{!data.career.history.length ? <p className="text-sm text-arena-muted">Nenhuma partida oficial finalizada.</p> : null}</CardContent></Card></div></div>
  </section>;
}

function PublicTeamProfile({ slug }: { slug:string }) {
  const [data,setData]=useState<PublicTeamProfileData|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void getPublicTeamProfile(slug).then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));},[slug]);
  if(loading)return <section className="space-y-5 px-4 py-8 lg:px-8"><Skeleton className="h-56"/><Skeleton className="h-52"/></section>;
  if(!data)return <section className="px-4 py-12 lg:px-8"><EmptyState title="Equipe indisponivel" description="Esta equipe não existe ou não está ativa."/></section>;
  const team=data.team;
  return <section className="px-4 pb-12 lg:px-8"><div className="relative -mx-4 h-56 overflow-hidden border-b border-arena-line bg-arena-panel bg-cover bg-center lg:-mx-8" style={team.banner?{backgroundImage:`url(${team.banner})`}:undefined}><div className="absolute inset-0 bg-black/60"/></div><div className="relative -mt-16 mb-6 flex items-end gap-4"><div className="flex h-28 w-28 items-center justify-center overflow-hidden border-2 border-cyan-300 bg-arena-panel">{team.logo?<img alt={team.nome} className="h-full w-full object-cover" src={team.logo}/>:<Shield className="h-11 w-11 text-cyan-200"/>}</div><div className="pb-1"><p className="text-xs font-semibold uppercase text-cyan-200">{team.game_name}</p><h1 className="font-display text-4xl font-bold">{team.nome}</h1><p className="mt-1 text-sm text-arena-muted">{team.tag||"Equipe Arena Camp"}</p></div></div><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Titulos" value={String(data.titles.length)} helper="Campeonatos oficiais" icon={<Trophy className="h-5 w-5"/>}/><StatCard label="Vitorias" value={String(team.wins)} helper={`${team.matches} partidas`} icon={<Medal className="h-5 w-5"/>}/><StatCard label="Membros" value={String(team.members)} helper="Elenco ativo" icon={<UserRound className="h-5 w-5"/>}/></div><Card className="mt-6"><CardHeader><h2 className="font-display text-xl font-semibold">Titulos conquistados</h2><p className="mt-1 text-sm text-arena-muted">Somente campeonatos vencidos oficialmente na Arena Camp.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.titles.map((title)=><Link className="group overflow-hidden border border-amber-300/30 bg-amber-300/[.05] transition hover:border-amber-300/60" key={title.id} to={`/torneios/${title.tournament_id}`}>{title.tournament_banner?<img alt="" className="h-28 w-full object-cover" src={title.tournament_banner}/>:null}<div className="p-4"><div className="flex items-center justify-between"><Trophy className="h-6 w-6 text-amber-200"/><Badge tone="success">Campeao</Badge></div><h3 className="mt-4 font-display text-xl font-bold">{title.tournament_name}</h3><p className="mt-1 text-sm text-arena-muted">{title.game_short_name} · {new Date(title.awarded_at).toLocaleDateString("pt-BR")}</p></div></Link>)}{!data.titles.length?<EmptyState title="Nenhum titulo ainda" description="As conquistas aparecerao automaticamente quando a equipe vencer um campeonato."/>:null}</CardContent></Card></section>;
}

function decimal(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value); }
