import { findTournamentsWithExpiredRegistration } from "../models/adminTournament.model.js";
import { findUserIdsByRole } from "../models/user.model.js";
import { notify } from "./notification.service.js";
import { updateTournamentStatus } from "./tournament.service.js";

const INTERVAL_MS = 5 * 60 * 1000;
let timer = null;

// Fecha as inscricoes dos torneios cujo prazo ("Inscricoes ate") passou. So muda aberto -> fechado
// e avisa os admins; inscricoes pendentes ficam para o admin decidir. Torneios Mix ficam de fora.
export async function closeExpiredRegistrations({ findDue, close, notify:notifyAdmins }) {
  const due = await findDue();
  let closed = 0;
  let failed = 0;
  for (const tournament of due) {
    try {
      await close(tournament.id);
      await notifyAdmins(tournament);
      closed += 1;
    } catch (error) {
      failed += 1;
      console.error(`Falha ao encerrar inscricoes do torneio #${tournament.id}:`, error.message);
    }
  }
  return { closed, failed };
}

async function notifyAdminsAboutClose(tournament) {
  const admins = await findUserIdsByRole("admin");
  const pending = tournament.pending ? ` ${tournament.pending} inscrição(ões) ainda sem pagamento.` : "";
  await Promise.all(admins.map((adminId) => notify({
    user_id:adminId,
    titulo:"Inscrições encerradas",
    mensagem:`As inscrições de ${tournament.nome} encerraram no prazo.${pending} Próximo passo: gerar a chave.`,
    tipo:"tournament_registration_closed",
    link:`/admin/torneios/${tournament.id}`,
    dedupe_key:`registration-closed:${tournament.id}:${adminId}`
  })));
}

export function startRegistrationCloser() {
  if (timer) return timer;
  const run = () => closeExpiredRegistrations({
    findDue:findTournamentsWithExpiredRegistration,
    close:(id) => updateTournamentStatus(id, "fechado"),
    notify:notifyAdminsAboutClose
  }).then((result) => { if (result.closed) console.log(`Inscricoes encerradas automaticamente: ${result.closed}`); })
    .catch((error) => console.error("Falha no fechamento automatico de inscricoes:", error.message));
  timer = setInterval(run, INTERVAL_MS);
  timer.unref?.();
  void run();
  return timer;
}
