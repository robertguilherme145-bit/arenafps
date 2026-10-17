// Sem dependencias: decide os passos e a proxima acao do cartao "Sua inscricao" na pagina do torneio.
export type GuideStep = { label:string; state:"feito" | "pendente" | "bloqueado" };
export type GuideAction = { label:string; href:string; tone:"urgent" | "primary" | "secondary" };
export type Guide = { steps:GuideStep[]; action:GuideAction | null; note:string | null };

type GuideInput = {
  loggedIn:boolean;
  tournament:{ status:string; format:string | null; game_id:number | null };
  teams:Array<{ team_id:number; game_id:number; role:"jogador" | "lider" | "capitao" }>;
  entries:Array<{ team_id:number; status:string; payment_status:string }>;
  nextMatchId:number | null;
  paid:boolean;
  free?:boolean;
};

const PAID = new Set(["pago", "aprovado", "isento"]);
const CLOSED_NOTE = "As inscrições estão encerradas para este campeonato.";

export function registrationGuide(input: GuideInput): Guide {
  const open = input.tournament.status === "aberto";
  const gameTeams = input.teams.filter((team) => input.tournament.game_id == null || team.game_id === input.tournament.game_id);
  const entry = input.entries.find((item) => gameTeams.some((team) => team.team_id === item.team_id) && item.status !== "cancelado") ?? null;
  const isLeader = Boolean(entry ? gameTeams.find((team) => team.team_id === entry.team_id && team.role === "lider") : gameTeams.some((team) => team.role === "lider"));
  const isPaid = Boolean(entry && (input.paid || PAID.has(entry.payment_status)));

  const steps: GuideStep[] = [
    { label:"Conta", state:input.loggedIn ? "feito" : "pendente" },
    { label:"Equipe", state:gameTeams.length ? "feito" : input.loggedIn ? "pendente" : "bloqueado" },
    { label:"Inscrição", state:entry ? "feito" : gameTeams.length ? "pendente" : "bloqueado" },
    ...(input.free ? [] : [{ label:"Pagamento", state:isPaid ? "feito" : entry ? "pendente" : "bloqueado" } as GuideStep]),
    { label:"Partida", state:input.nextMatchId ? "feito" : "pendente" }
  ];
  const result = (action: GuideAction | null, note: string | null = null): Guide => ({ steps, action, note });

  // Sem inscricao num torneio fechado, os passos nao ajudam: so o aviso.
  const closedForMe = (): Guide => ({ steps:[], action:null, note:CLOSED_NOTE });
  if (!input.loggedIn) return open ? result({ label:"Criar conta para participar", href:"/criar-conta", tone:"urgent" }) : closedForMe();
  if (input.tournament.format === "mix_single_elimination") {
    return open ? result({ label:"Inscrever-se no Mix", href:"/jogador?module=mix", tone:"urgent" }) : result({ label:"Ver minha inscrição no Mix", href:"/jogador?module=mix", tone:"secondary" });
  }

  if (entry) {
    if (!isPaid && !input.free) {
      return isLeader ? result({ label:"Pagar inscrição", href:"/lider?module=finance", tone:"urgent" }) : result(null, "Aguardando o líder pagar a inscrição da equipe.");
    }
    if (input.nextMatchId) return result({ label:"Ir para a partida", href:"/jogador?module=matches", tone:"primary" });
    if (entry.status === "confirmado") return result(null, "Inscrição confirmada. A chave sai quando as inscrições encerrarem.");
    return result(null, "Inscrição enviada. Aguardando a aprovação da organização.");
  }

  if (!open) return closedForMe();
  if (!gameTeams.length) return result({ label:"Criar ou entrar numa equipe", href:"/jogador?module=teams", tone:"primary" });
  if (isLeader) return result({ label:"Inscrever equipe", href:"/lider?module=tournaments", tone:"urgent" });
  return result(null, "Peça ao líder da sua equipe para inscrever vocês neste campeonato.");
}
