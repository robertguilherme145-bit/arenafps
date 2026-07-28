import bcrypt from "bcrypt";
import pool from "../src/config/database.js";
import { registerMatch } from "../src/services/match.service.js";

const tournamentName = process.argv[2] || "TESTE";
const passwordHash = await bcrypt.hash("ArenaTeste@2026", 10);
const connection = await pool.getConnection();
const createdTeams = [];

try {
  const [[tournament]] = await connection.query(
    `SELECT id,nome,status,game,max_teams,titulares FROM tournaments WHERE nome=? ORDER BY id DESC LIMIT 1`,
    [tournamentName]
  );
  if (!tournament) throw new Error(`Torneio ${tournamentName} nao encontrado.`);
  if (Number(tournament.max_teams) !== 5 || Number(tournament.titulares) !== 2) {
    throw new Error("O teste exige um torneio com 5 equipes e 2 titulares.");
  }

  const [[existing]] = await connection.query(
    `SELECT COUNT(*) total FROM teams WHERE slug LIKE ?`,
    [`teste-live-${tournament.id}-%`]
  );
  if (Number(existing.total)) throw new Error("As equipes deste teste ja foram cadastradas.");

  await connection.beginTransaction();
  for (let teamIndex = 1; teamIndex <= 5; teamIndex += 1) {
    const users = [];
    for (let playerIndex = 1; playerIndex <= 2; playerIndex += 1) {
      const nickname = `Teste${teamIndex}P${playerIndex}`;
      const email = `live-test-t${tournament.id}-${teamIndex}-${playerIndex}@arenacamp.local`;
      const role = playerIndex === 1 ? "capitao" : "jogador";
      const [userResult] = await connection.query(
        `INSERT INTO users (nome,email,email_verified_at,onboarding_completed_at,senha_hash,nickname,role)
         VALUES (?,?,NOW(),NOW(),?,?,?)`,
        [`Jogador Teste ${teamIndex}.${playerIndex}`, email, passwordHash, nickname, role]
      );
      const userId = Number(userResult.insertId);
      await connection.query(`INSERT INTO user_roles (user_id,role) VALUES (?,?)`, [userId, role]);
      await connection.query(`INSERT INTO user_games (user_id,game_id,is_primary) VALUES (?,?,1)`, [userId, Number(tournament.game)]);
      users.push({ id: userId, nickname, role, email });
    }

    const [teamResult] = await connection.query(
      `INSERT INTO teams (game_id,creator_id,nome,tag,slug,descricao,recrutando,privada,ativo)
       VALUES (?,?,?,?,?,'Equipe criada para teste assistido da Arena Camp',0,1,1)`,
      [Number(tournament.game), users[0].id, `Equipe Teste ${teamIndex}`, `T${teamIndex}`, `teste-live-${tournament.id}-${teamIndex}`]
    );
    const teamId = Number(teamResult.insertId);
    const players = [];
    for (const user of users) {
      await connection.query(
        `INSERT INTO team_members (team_id,user_id,cargo,lineup_status,status) VALUES (?,?,?,'titular','ativo')`,
        [teamId, user.id, user.role === "capitao" ? "captain" : "player"]
      );
      const [playerResult] = await connection.query(
        `INSERT INTO players (team_id,user_id,nick,game,game_uid,status) VALUES (?,?,?,?,?,'ativo')`,
        [teamId, user.id, user.nickname, String(tournament.game), `TEST-${tournament.id}-${teamIndex}-${user.id}`]
      );
      players.push(Number(playerResult.insertId));
    }

    const [entryResult] = await connection.query(
      `INSERT INTO entries (tournament_id,team_id,status,payment_status,rules_accepted_at)
       VALUES (?,?,'confirmado','pago',NOW())`,
      [Number(tournament.id), teamId]
    );
    for (let index = 0; index < players.length; index += 1) {
      await connection.query(
        `INSERT INTO entry_players (entry_id,player_id,titular,ordem,confirmado) VALUES (?,?,1,?,1)`,
        [Number(entryResult.insertId), players[index], index + 1]
      );
    }
    createdTeams.push({ id: teamId, nome: `Equipe Teste ${teamIndex}`, users });
  }
  await connection.query(`UPDATE tournaments SET status='fechado' WHERE id=?`, [Number(tournament.id)]);
  await connection.commit();

  const rotating = [...createdTeams.map((team) => team.id), null];
  const pairings = [];
  for (let round = 1; round <= 5; round += 1) {
    for (let index = 0; index < rotating.length / 2; index += 1) {
      const teamA = rotating[index];
      const teamB = rotating[rotating.length - 1 - index];
      if (teamA && teamB) pairings.push({ round, teamA, teamB });
    }
    rotating.splice(1, 0, rotating.pop());
  }
  for (const pairing of pairings) {
    await registerMatch({
      tournament_id: Number(tournament.id),
      round: pairing.round,
      team_a_id: pairing.teamA,
      team_b_id: pairing.teamB
    });
  }
  await pool.query(`UPDATE tournaments SET status='em_andamento' WHERE id=?`, [Number(tournament.id)]);

  console.log(JSON.stringify({
    tournament: { id: Number(tournament.id), nome: tournament.nome, status: "em_andamento" },
    teams: createdTeams,
    matches: pairings.length,
    test_password: "ArenaTeste@2026"
  }, null, 2));
} catch (error) {
  await connection.rollback().catch(() => undefined);
  throw error;
} finally {
  connection.release();
  await pool.end();
}
