import { AlertTriangle, CheckCircle2, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "../ui/Badge";

type RegulationTournament = {
  format?: string | null;
  best_of?: string | null;
  overtime_enabled?: boolean | number | null;
  initial_side?: string | null;
  pause_minutes?: number | null;
  walkover_minutes?: number | null;
  tiebreakers?: string | null;
  seed_mode?: string | null;
  registration_approval?: string | null;
  pick_ban_enabled?: boolean | number | null;
  descricao?: string | null;
};

type RegulationMap = { id: number; nome: string; imagem?: string | null };

const FORMATS: Record<string, { label: string; description: string }> = {
  single_elimination: { label: "Eliminacao simples", description: "Quem perde a serie e eliminado; o vencedor avanca ate a final." },
  double_elimination: { label: "Eliminacao dupla", description: "A equipe permanece no torneio ate sofrer a segunda derrota." },
  swiss: { label: "Sistema suico", description: "Equipes com campanhas semelhantes se enfrentam; classificacao por pontos e criterios protegidos." },
  round_robin: { label: "Todos contra todos", description: "Todas as equipes se enfrentam e a classificacao e definida pela campanha completa." },
  league: { label: "Liga", description: "Temporada por pontos, com confrontos programados e classificacao acumulada." },
  group_playoffs: { label: "Grupos e eliminatorias", description: "A fase de grupos classifica as melhores equipes para confrontos eliminatorios." },
  mix_single_elimination: { label: "Mix em eliminacao simples", description: "Os jogadores sao distribuidos nas equipes e cada derrota elimina a equipe do torneio." },
  custom: { label: "Personalizado", description: "Estrutura especial publicada pela organizacao no regulamento adicional." },
};

export function TournamentRegulationPanel({ tournament, mapPool = [], compact = false }: { tournament: RegulationTournament; mapPool?: RegulationMap[]; compact?: boolean }) {
  const format = FORMATS[tournament.format || ""] || { label: tournament.format || "A definir", description: "A organizacao publicara a estrutura competitiva." };
  const series = String(tournament.best_of || "bo3").toUpperCase();
  return <div className="space-y-5">
    <div className="border border-cyan-400/30 bg-cyan-400/[.06] p-4">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" /><div><p className="font-semibold">{format.label} · {series}</p><p className="mt-1 text-sm text-arena-muted">{format.description}</p></div></div>
    </div>
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
      <Rule title="Pontuacao" text="3 pontos por vitoria de serie. Nao existem pontos artificiais por mapas que nao foram jogados." />
      <Rule title="Desempate protegido" text="Pontos, confronto direto, aproveitamento e saldo medio por mapa realmente jogado." />
      <Rule title="Serie encerrada" text={`Em ${series}, a serie termina ao atingir a maioria. Um 2 x 0 continua 2 x 0; o mapa restante e cancelado.`} />
      <Rule title="Pick & Ban" text={tournament.pick_ban_enabled ? "Ativo, seguindo a ordem publicada pela organizacao." : "Desativado para este torneio."} />
      <Rule title="Operacao" text={`Pausa: ${tournament.pause_minutes ?? 0} min · W.O.: ${tournament.walkover_minutes ?? 0} min · Prorrogacao: ${tournament.overtime_enabled ? "permitida" : "nao permitida"}.`} />
      <Rule title="Inscricoes" text={tournament.registration_approval === "automatic" ? "Aprovacao automatica quando os requisitos forem atendidos." : "Confirmacao sujeita a validacao da organizacao."} />
    </div>
    {mapPool.length ? <div><p className="mb-3 text-sm font-semibold">Mapas habilitados</p><div className="flex flex-wrap gap-2">{mapPool.map((map) => <Badge key={map.id} tone="info">{map.nome}</Badge>)}</div></div> : null}
    <div className="border border-arena-line p-4"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-cyan-200" /><p className="font-semibold">Regras adicionais da organizacao</p></div><p className="mt-3 whitespace-pre-wrap text-sm text-arena-muted">{tournament.descricao || "Nenhuma regra adicional foi publicada."}</p></div>
    <div className="flex items-start gap-2 text-xs text-arena-muted"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>O aceite fica registrado na inscricao. Alteracoes relevantes devem ser comunicadas oficialmente pela organizacao.</p></div>
  </div>;
}

function Rule({ title, text }: { title: string; text: string }) {
  return <div className="border border-arena-line bg-black/20 p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><p className="text-sm font-semibold">{title}</p></div><p className="mt-2 text-sm leading-6 text-arena-muted">{text}</p></div>;
}
