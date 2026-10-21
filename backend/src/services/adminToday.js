// Monta a fila "Hoje" do Painel da organizacao: o que pede acao agora, do mais urgente ao menos,
// cada item com o endereco que resolve. Sem banco aqui: recebe os dados prontos (facil de testar).

const STALE_PIX_MINUTES = 30;

export function buildTodayQueue({ disputes = [], payments = [], matches = [], tickets = [], contacts = 0, tournaments = [], numbers = {}, manualToConfirm = 0, pixSetupMissing = false }, now = new Date()) {
  const items = [];

  if (pixSetupMissing) {
    items.push({
      key:"pix-config", kind:"pagamento", severity:"alta",
      title:"Cadastre sua chave PIX",
      detail:"O recebimento está no PIX próprio, mas falta a chave. Sem ela ninguém consegue pagar a inscrição.",
      action:"Configurar recebimento", href:"/admin/financeiro"
    });
  }

  if (manualToConfirm > 0) {
    items.push({
      key:"pix-confirmar", kind:"pagamento", severity:"alta",
      title:`${manualToConfirm} ${manualToConfirm === 1 ? "PIX para confirmar" : "PIX para confirmar"}`,
      detail:"Confira no extrato do banco e confirme no Financeiro.",
      action:"Confirmar pagamentos", href:"/admin/financeiro"
    });
  }

  for (const dispute of disputes) {
    items.push({
      key:`disputa-${dispute.id}`, kind:"disputa", severity:"alta",
      title:`Disputa aberta: ${dispute.title}`,
      detail:dispute.tournament_name ? `${dispute.tournament_name} · partida #${dispute.match_id}` : `Partida #${dispute.match_id}`,
      action:"Analisar disputa", href:"/admin/comunidade?aba=equipes"
    });
  }

  for (const match of matches) {
    const late = new Date(match.scheduled_at).getTime() <= now.getTime();
    items.push({
      key:`sala-${match.id}`, kind:"partida", severity:late ? "alta" : "media",
      title:`Partida sem sala: ${match.team_a ?? "A definir"} x ${match.team_b ?? "A definir"}`,
      detail:`${match.tournament_name} · ${late ? "já devia ter começado" : "começa em até 24h"}`,
      action:"Preparar a sala", href:"/admin/partidas"
    });
  }

  const stale = payments.filter((payment) => now.getTime() - new Date(payment.created_at).getTime() >= STALE_PIX_MINUTES * 60_000);
  if (stale.length) {
    items.push({
      key:"pix-parado", kind:"pagamento", severity:"media",
      title:`${stale.length} ${stale.length === 1 ? "PIX parado" : "PIX parados"} há mais de ${STALE_PIX_MINUTES} minutos`,
      detail:stale.slice(0, 3).map((payment) => payment.team_name ?? `Pagamento #${payment.id}`).join(", "),
      action:"Conferir pagamentos", href:"/admin/financeiro"
    });
  }

  for (const tournament of tournaments) {
    const step = tournamentStep(tournament);
    if (!step) continue;
    items.push({
      key:`torneio-${tournament.id}`, kind:"torneio", severity:"media",
      title:`${tournament.nome}: ${step.title}`, detail:step.detail,
      action:step.action, href:`/admin/torneios/${tournament.id}`
    });
  }

  if (tickets.length) {
    const urgent = tickets.filter((ticket) => ticket.priority === "alta" || ticket.priority === "critica").length;
    items.push({
      key:"chamados", kind:"chamado", severity:urgent ? "alta" : "baixa",
      title:`${tickets.length} ${tickets.length === 1 ? "chamado aberto" : "chamados abertos"}`,
      detail:urgent ? `${urgent} com prioridade alta` : "Sem prioridade alta",
      action:"Responder chamados", href:"/admin/comunidade?aba=equipes"
    });
  }

  if (contacts > 0) {
    items.push({
      key:"contato", kind:"contato", severity:"baixa",
      title:`${contacts} ${contacts === 1 ? "mensagem nova" : "mensagens novas"} de contato`,
      detail:"Enviadas pelo formulário do site", action:"Ler mensagens", href:"/admin/conteudo"
    });
  }

  const order = { alta:0, media:1, baixa:2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    items,
    numbers:{
      matches_today:Number(numbers.matches_today ?? 0),
      live_matches:Number(numbers.live_matches ?? 0),
      registrations_today:Number(numbers.registrations_today ?? 0),
      revenue_today:Number(numbers.revenue_today ?? 0)
    }
  };
}

// Etapa parada de um torneio, ou null quando nao ha nada a fazer agora.
export function tournamentStep(tournament) {
  const pending = Number(tournament.pending_entries ?? 0);
  if (tournament.status === "criado") return { title:"rascunho não publicado", detail:"Confira a lista e publique quando estiver pronto.", action:"Abrir rascunho" };
  if (pending > 0 && (tournament.status === "aberto" || tournament.status === "fechado")) {
    return { title:`${pending} ${pending === 1 ? "inscrição aguardando" : "inscrições aguardando"} decisão`, detail:"Aprove ou recuse as equipes.", action:"Ver inscrições" };
  }
  if (tournament.status === "fechado" && Number(tournament.match_count ?? 0) === 0) {
    return { title:"inscrições encerradas, chave não gerada", detail:"O próximo passo é gerar a chave.", action:"Gerar chave" };
  }
  return null;
}
