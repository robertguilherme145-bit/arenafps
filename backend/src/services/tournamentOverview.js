// Regra pura da pagina do torneio no painel: etapa atual, checklist de publicacao e a unica proxima acao.
const STAGES = {
  equipes:[["rascunho", "Rascunho"], ["inscricoes", "Inscrições abertas"], ["encerradas", "Inscrições encerradas"], ["chave", "Chave gerada"], ["andamento", "Em andamento"], ["finalizado", "Finalizado"]],
  custom:[["rascunho", "Rascunho"], ["inscricoes", "Inscrições abertas"], ["encerradas", "Inscrições encerradas"], ["chave", "Partidas criadas"], ["andamento", "Em andamento"], ["finalizado", "Finalizado"]],
  mix:[["rascunho", "Rascunho"], ["inscricoes", "Inscrições abertas"], ["sorteio", "Sorteio"], ["andamento", "Em andamento"], ["finalizado", "Finalizado"]]
};

export function buildTournamentOverview({ tournament, settings, mapCount, entries, matchCount }) {
  const format = settings?.format ?? null;
  const kind = format === "mix_single_elimination" ? "mix" : format === "custom" ? "custom" : "equipes";
  const status = tournament.status;
  const current = currentStage(kind, status, matchCount);
  const order = STAGES[kind].map(([key]) => key);
  const currentIndex = order.indexOf(current);
  const stages = STAGES[kind].map(([key, label], index) => ({
    key, label,
    state:currentIndex < 0 ? "pendente" : index < currentIndex ? "feito" : index === currentIndex ? "atual" : "pendente"
  }));

  const checklist = buildChecklist(tournament, settings, mapCount);
  const ready = checklist.every((entry) => !entry.required || entry.done);
  const { nextAction, note } = nextStep(kind, status, matchCount, entries);
  return { kind, stage:current, stages, checklist, ready, nextAction, note };
}

function currentStage(kind, status, matchCount) {
  if (status === "criado") return "rascunho";
  if (status === "aberto") return "inscricoes";
  if (status === "fechado") return kind === "mix" ? "sorteio" : matchCount > 0 ? "chave" : "encerradas";
  if (status === "em_andamento") return "andamento";
  if (status === "finalizado") return "finalizado";
  return null;
}

function nextStep(kind, status, matchCount, entries) {
  if (status === "cancelado") return { nextAction:null, note:"Torneio cancelado." };
  if (status === "finalizado") return { nextAction:null, note:"Torneio finalizado. Os resultados ficam na página pública." };
  if (status === "em_andamento") return { nextAction:null, note:"As partidas estão em andamento. A final encerra o torneio sozinha." };
  if (status === "criado") return { nextAction:{ key:"publish", label:"Publicar e abrir inscrições", status:"aberto" }, note:null };
  if (kind === "mix") return { nextAction:{ key:"draw", label:"Sortear equipes" }, note:null };
  if (status === "aberto") {
    const pending = entries?.pending_payment ?? 0;
    return { nextAction:{ key:"close", label:"Encerrar inscrições", status:"fechado" }, note:pending ? `${pending} inscrição(ões) ainda sem pagamento.` : null };
  }
  if (matchCount > 0) return { nextAction:{ key:"start", label:"Iniciar torneio", status:"em_andamento" }, note:null };
  if (kind === "custom") return { nextAction:{ key:"manual", label:"Criar partidas", href:"/admin?module=operations" }, note:"Este formato usa confrontos criados à mão." };
  return { nextAction:{ key:"structure", label:"Gerar chave" }, note:null };
}

function buildChecklist(tournament, settings, mapCount) {
  const start = new Date(tournament.inicio ?? "");
  const end = new Date(tournament.fim ?? "");
  const datesOk = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
  const seriesLength = Number(String(settings?.best_of ?? "bo1").replace(/\D/g, "")) || 1;
  const vetoOn = Boolean(Number(settings?.pick_ban_enabled ?? 0));
  const mapsOk = mapCount >= 1 && (!vetoOn || mapCount >= seriesLength);
  return [
    { key:"informacoes", label:"Informações básicas", required:true, done:Boolean(String(tournament.nome ?? "").trim()) && datesOk, hint:"Nome e datas de início e fim, com o início antes do fim." },
    { key:"formato", label:"Formato e série", required:true, done:Boolean(settings?.format), hint:"Escolha o formato (eliminação, pontos corridos...) e a série." },
    { key:"inscricoes", label:"Inscrições", required:true, done:Number(tournament.max_teams) > 0 && Number(tournament.titulares) > 0, hint:"Vagas e número de titulares." },
    { key:"mapas", label:"Mapas e veto", required:true, done:mapsOk, hint:vetoOn ? `Com veto ligado, o map pool precisa de pelo menos ${seriesLength} mapas.` : "Escolha ao menos um mapa." },
    { key:"premiacao", label:"Premiação", required:false, done:Boolean(String(tournament.premiacao ?? "").trim()), hint:"Opcional, mas atrai inscrições." },
    { key:"banner", label:"Banner", required:false, done:Boolean(tournament.banner), hint:"Opcional." }
  ];
}
