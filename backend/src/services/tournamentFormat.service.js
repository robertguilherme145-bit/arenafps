import pool from "../config/database.js";
import { calculateTournamentRanking } from "./ranking.service.js";
import { createAuditLog } from "../models/auditLog.model.js";

const AUTOMATIC_FORMATS = new Set(["single_elimination", "double_elimination", "swiss", "round_robin", "group_playoffs", "league"]);

export function roundRobinPairings(teamIds, doubleLeg = false) {
  const teams = [...teamIds.map(Number)];
  if (teams.length % 2) teams.push(null);
  const rounds = [];
  for (let round = 0; round < teams.length - 1; round += 1) {
    const pairs = [];
    for (let index = 0; index < teams.length / 2; index += 1) {
      const left = teams[index];
      const right = teams[teams.length - 1 - index];
      if (left && right) pairs.push(round % 2 ? [right, left] : [left, right]);
    }
    rounds.push(pairs);
    teams.splice(1, 0, teams.pop());
  }
  if (!doubleLeg) return rounds;
  return [...rounds, ...rounds.map(pairs => pairs.map(([a, b]) => [b, a]))];
}

export function seededPairings(teamIds) {
  const teams = [...teamIds.map(Number)];
  const pairs = [];
  for (let index = 0; index < Math.floor(teams.length / 2); index += 1) {
    pairs.push([teams[index], teams[teams.length - 1 - index]]);
  }
  return { pairs, byes: teams.length % 2 ? [teams[Math.floor(teams.length / 2)]] : [] };
}

export async function generateTournamentStructure(adminUser, tournamentId) {
  const context = await loadContext(tournamentId);
  if (!AUTOMATIC_FORMATS.has(context.format)) throw new Error("Este formato usa confrontos manuais.");
  if (!["fechado", "em_andamento"].includes(context.status)) throw new Error("Encerre as inscricoes antes de gerar os confrontos.");
  if (context.matches.length) throw new Error("A estrutura ja foi gerada. Exclua os confrontos antes de gerar novamente.");
  if (context.teams.length < 2) throw new Error("Confirme pelo menos duas equipes antes de gerar a estrutura.");
  if (context.format === "group_playoffs" && context.teams.length < 4) throw new Error("A fase de grupos exige pelo menos quatro equipes confirmadas.");

  const ids = context.teams.map(team => Number(team.team_id));
  if (context.format === "round_robin" || context.format === "league") {
    const rounds = roundRobinPairings(ids, context.format === "league");
    for (let round = 0; round < rounds.length; round += 1) {
      for (const [a, b] of rounds[round]) await insertMatch(context, round + 1, a, b, "league", null, context.format === "league" && round >= rounds.length / 2 ? 2 : 1);
    }
  } else if (context.format === "group_playoffs") {
    await generateGroups(context, ids);
  } else {
    const { pairs, byes } = seededPairings(ids);
    for (const [a, b] of pairs) await insertMatch(context, 1, a, b, context.format === "swiss" ? "swiss" : "bracket");
    if (context.format === "swiss" && byes.length) await saveBye(context.tournament_id, 1, byes[0]);
  }
  await audit(adminUser, tournamentId, "tournament.structure.generated", { format: context.format, teams: ids.length });
  return loadContext(tournamentId);
}

export async function advanceTournamentFormat(tournamentId) {
  const context = await loadContext(tournamentId);
  if (!AUTOMATIC_FORMATS.has(context.format) || !context.matches.length) return false;
  if (context.matches.some(match => match.status !== "finalizada")) return false;
  if (["round_robin", "league"].includes(context.format)) return false;
  if (context.format === "group_playoffs") return advanceGroups(context);
  if (context.format === "swiss") return advanceSwiss(context);
  return advanceElimination(context, context.format === "double_elimination" ? 2 : 1);
}

async function advanceElimination(context, lossLimit) {
  const losses = lossCounts(context.matches);
  const active = context.teams.map(team => Number(team.team_id)).filter(id => (losses.get(id) ?? 0) < lossLimit);
  if (active.length <= 1) return false;
  const maxRound = Math.max(...context.matches.map(match => Number(match.round)));
  const existing = context.matches.filter(match => Number(match.round) === maxRound + 1);
  if (existing.length) return false;
  const ranked = sortForPairing(active, context.matches, losses);
  const pairs = lossLimit === 2 ? pairDoubleElimination(ranked, context.matches, losses) : seededPairings(ranked).pairs;
  for (const [a, b] of pairs) await insertMatch(context, maxRound + 1, a, b, "bracket");
  return pairs.length > 0;
}

async function advanceSwiss(context) {
  const maxRound = Math.max(...context.matches.map(match => Number(match.round)));
  const targetRounds = Math.max(3, Math.ceil(Math.log2(context.teams.length)) + 1);
  if (maxRound >= targetRounds) return false;
  const ranking = calculateTournamentRanking(context.matches, context.byes);
  const pending = ranking.map(row => Number(row.team_id));
  let bye = null;
  if (pending.length % 2) {
    const previous = new Set(context.byes.map(item => Number(item.team_id)));
    const index = [...pending].reverse().findIndex(id => !previous.has(id));
    const actualIndex = index < 0 ? pending.length - 1 : pending.length - 1 - index;
    [bye] = pending.splice(actualIndex, 1);
  }
  const pairs = pairAvoidingRematches(pending, context.matches);
  for (const [a, b] of pairs) await insertMatch(context, maxRound + 1, a, b, "swiss");
  if (bye) await saveBye(context.tournament_id, maxRound + 1, bye);
  return pairs.length > 0;
}

async function generateGroups(context, ids) {
  const groupCount = Math.max(2, Math.min(4, Math.floor(ids.length / 3) || 2));
  const groups = Array.from({ length: groupCount }, () => []);
  ids.forEach((id, index) => groups[index % groupCount].push(id));
  let globalRound = 1;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const rounds = roundRobinPairings(groups[groupIndex]);
    for (let round = 0; round < rounds.length; round += 1) {
      for (const [a, b] of rounds[round]) await insertMatch(context, globalRound + round, a, b, "group", String.fromCharCode(65 + groupIndex));
    }
    globalRound = Math.max(globalRound, rounds.length + 1);
  }
}

async function advanceGroups(context) {
  if (context.matches.some(match => match.stage === "playoff")) return advancePlayoffs(context);
  const groups = [...new Set(context.matches.filter(match => match.stage === "group").map(match => match.group_code))];
  const qualified = [];
  for (const code of groups) {
    const groupMatches = context.matches.filter(match => match.group_code === code);
    qualified.push(...calculateTournamentRanking(groupMatches).slice(0, 2).map(row => Number(row.team_id)));
  }
  if (qualified.length < 2) return false;
  const round = Math.max(...context.matches.map(match => Number(match.round))) + 1;
  const { pairs } = seededPairings(qualified);
  for (const [a, b] of pairs) await insertMatch(context, round, a, b, "playoff");
  return true;
}

async function advancePlayoffs(context) {
  const playoff = context.matches.filter(match => match.stage === "playoff");
  const losses = lossCounts(playoff);
  const participants = [...new Set(playoff.flatMap(match => [Number(match.team_a_id), Number(match.team_b_id)]))];
  const active = participants.filter(id => (losses.get(id) ?? 0) < 1);
  if (active.length <= 1) return false;
  const round = Math.max(...context.matches.map(match => Number(match.round))) + 1;
  const { pairs } = seededPairings(active);
  for (const [a, b] of pairs) await insertMatch(context, round, a, b, "playoff");
  return pairs.length > 0;
}

async function loadContext(tournamentId) {
  const [[tournament]] = await pool.query(`SELECT t.id,t.status,t.nome,tcs.format,tcs.best_of,tcs.pick_ban_enabled FROM tournaments t INNER JOIN tournament_competition_settings tcs ON tcs.tournament_id=t.id WHERE t.id=?`, [tournamentId]);
  if (!tournament) throw new Error("Torneio ou regulamento nao encontrado.");
  const [teams] = await pool.query(`SELECT e.team_id,t.nome FROM entries e INNER JOIN teams t ON t.id=e.team_id WHERE e.tournament_id=? AND e.status='confirmado' ORDER BY e.id`, [tournamentId]);
  const [matches] = await pool.query(`SELECT m.*,COALESCE(mm.maps_played,0) maps_played,COALESCE(mm.rounds_for_a,0) rounds_for_a,COALESCE(mm.rounds_for_b,0) rounds_for_b FROM matches m LEFT JOIN (SELECT match_id,COUNT(*) maps_played,SUM(score_team_a) rounds_for_a,SUM(score_team_b) rounds_for_b FROM match_maps WHERE status='finalizado' GROUP BY match_id) mm ON mm.match_id=m.id WHERE m.tournament_id=? ORDER BY m.round,m.id`, [tournamentId]);
  const [byes] = await pool.query(`SELECT round,team_id FROM tournament_byes WHERE tournament_id=? ORDER BY round`, [tournamentId]);
  return { ...tournament, tournament_id:Number(tournament.id), teams, matches, byes };
}

async function insertMatch(context, round, teamA, teamB, stage, groupCode = null, leg = 1) {
  if (!teamA || !teamB || Number(teamA) === Number(teamB)) throw new Error("Confronto invalido detectado pelo motor.");
  const [[duplicate]] = await pool.query(`SELECT id FROM matches WHERE tournament_id=? AND round=? AND ((team_a_id=? AND team_b_id=?) OR (team_a_id=? AND team_b_id=?)) LIMIT 1`, [context.tournament_id, round, teamA, teamB, teamB, teamA]);
  if (duplicate) return duplicate.id;
  const [result] = await pool.query(`INSERT INTO matches (tournament_id,round,team_a_id,team_b_id,status,stage,group_code,leg) VALUES (?,?,?,?,'agendada',?,?,?)`, [context.tournament_id, round, teamA, teamB, stage, groupCode, leg]);
  await pool.query(`INSERT INTO match_competition_settings (match_id,best_of,pick_ban_enabled) VALUES (?,?,?)`, [result.insertId, context.best_of, context.pick_ban_enabled ? 1 : 0]);
  return Number(result.insertId);
}

function lossCounts(matches) { const losses = new Map(); for (const match of matches.filter(item => item.status === "finalizada")) { const loser = Number(match.winner_team_id) === Number(match.team_a_id) ? Number(match.team_b_id) : Number(match.team_a_id); losses.set(loser, (losses.get(loser) ?? 0) + 1); } return losses; }
function sortForPairing(ids, matches, losses) { return [...ids].sort((a,b) => (losses.get(a) ?? 0) - (losses.get(b) ?? 0) || a-b); }
function pairAvoidingRematches(ids, matches) { const remaining=[...ids], pairs=[]; while(remaining.length>1){const a=remaining.shift();let index=remaining.findIndex(b=>!matches.some(m=>[Number(m.team_a_id),Number(m.team_b_id)].includes(a)&&[Number(m.team_a_id),Number(m.team_b_id)].includes(b)));if(index<0)index=0;const[b]=remaining.splice(index,1);pairs.push([a,b]);}return pairs; }
function pairDoubleElimination(ids,matches,losses){const groups=new Map();for(const id of ids){const key=losses.get(id)??0;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);}const pairs=[],left=[];for(const group of groups.values()){const local=pairAvoidingRematches(group,matches);pairs.push(...local);if(group.length%2)left.push(group.at(-1));}pairs.push(...pairAvoidingRematches(left,matches));return pairs;}
async function saveBye(tournamentId,round,teamId){await pool.query(`INSERT INTO tournament_byes (tournament_id,round,team_id) VALUES (?,?,?)`,[tournamentId,round,teamId]);}
async function audit(user,tournamentId,action,details){if(!user?.id)return;await createAuditLog({actor_user_id:user.id,action,entity_type:"tournament",entity_id:tournamentId,details});}
