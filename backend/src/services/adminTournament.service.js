import { deleteDraftTournament, findTournamentCopySource, findTournamentOverviewData, setRegistrationClosesAt } from "../models/adminTournament.model.js";
import { saveTournamentCompetition } from "./competitionSetup.service.js";
import { configureMixTournament } from "./mixTournament.service.js";
import { registerTournament } from "./tournament.service.js";
import { buildTournamentOverview } from "./tournamentOverview.js";

const defaultDeps = { registerTournament, saveTournamentCompetition, setRegistrationClosesAt, configureMixTournament, deleteDraftTournament };

// Cria o rascunho em uma chamada: torneio, configuracoes, prazo das inscricoes e Mix.
// Se algo falhar depois de criar, o rascunho e apagado para nao ficar torneio pela metade.
export async function createTournamentDraftWith(deps, adminUser, payload) {
  const tournamentInput = payload?.tournament ?? {};
  const competition = payload?.competition ?? {};
  const closesAt = parseClosesAt(competition.registration_closes_at, tournamentInput.inicio);

  const created = await deps.registerTournament({ ...tournamentInput });
  const id = Number(created.id);
  try {
    await deps.saveTournamentCompetition(adminUser, id, competition);
    if (closesAt !== undefined) await deps.setRegistrationClosesAt(id, closesAt);
    if (payload?.mix) await deps.configureMixTournament(id, payload.mix);
  } catch (error) {
    await deps.deleteDraftTournament(id);
    throw error;
  }
  return { id };
}

export function createTournamentDraft(adminUser, payload) {
  return createTournamentDraftWith(defaultDeps, adminUser, payload);
}

export async function getTournamentOverview(tournamentId) {
  const data = await findTournamentOverviewData(Number(tournamentId));
  if (!data) { const error = new Error("Torneio nao encontrado."); error.status = 404; throw error; }
  return { tournament:data.tournament, settings:data.settings, entries:data.entries, matchCount:data.matchCount, mapCount:data.mapCount, ...buildTournamentOverview(data) };
}

// Duplica um torneio como novo rascunho: mesmas regras, mapas, premiacao e banner; datas uma semana a frente para revisar.
export async function duplicateTournament(adminUser, tournamentId) {
  const source = await findTournamentCopySource(Number(tournamentId));
  if (!source) throw new Error("Torneio nao encontrado.");
  const { tournament, settings, mapIds, mix } = source;
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const duration = Math.max(60 * 60 * 1000, new Date(tournament.fim).getTime() - new Date(tournament.inicio).getTime() || 0);
  const payload = {
    tournament:{
      nome:`${tournament.nome} (cópia)`.slice(0, 255), descricao:tournament.descricao, game:tournament.game, valor:tournament.valor,
      max_teams:tournament.max_teams, titulares:tournament.titulares, reservas:tournament.reservas, premiacao:tournament.premiacao,
      banner:tournament.banner, inicio:start.toISOString().slice(0, 19).replace("T", " "), fim:new Date(start.getTime() + duration).toISOString().slice(0, 19).replace("T", " ")
    },
    competition:settings ? {
      game_id:settings.game_id, format:settings.format, best_of:settings.best_of, pick_ban_enabled:Boolean(settings.pick_ban_enabled),
      veto_order:parseJson(settings.veto_order, []), auto_decider:Boolean(settings.auto_decider), overtime_enabled:Boolean(settings.overtime_enabled),
      initial_side:settings.initial_side, pause_minutes:settings.pause_minutes, walkover_minutes:settings.walkover_minutes,
      seed_mode:settings.seed_mode, registration_approval:settings.registration_approval, map_ids:mapIds
    } : { game_id:tournament.game, map_ids:mapIds },
    mix:mix ? { payment_mode:mix.payment_mode, price_per_player:mix.price_per_player, team_count:mix.team_count, players_per_team:mix.players_per_team, team_labels:parseJson(mix.team_labels, undefined) } : undefined
  };
  return createTournamentDraft(adminUser, payload);
}

function parseClosesAt(value, startValue) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const closesAt = new Date(value);
  if (Number.isNaN(closesAt.getTime())) throw new Error("Informe uma data válida em \"Inscrições até\".");
  const start = new Date(startValue);
  if (!Number.isNaN(start.getTime()) && closesAt > start) throw new Error("\"Inscrições até\" precisa ser antes do início do torneio.");
  return closesAt;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
