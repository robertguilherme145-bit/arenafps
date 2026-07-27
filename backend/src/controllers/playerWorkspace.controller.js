import {
  answerPlayerInvite,
  cancelPlayerTeamRequest,
  changePlayerPassword,
  confirmPlayerTwoFactor,
  disablePlayerTwoFactor,
  getPlayerMatchRoom,
  getPublicPlayerProfile,
  getPlayerTeamSearch,
  getPlayerWorkspace,
  leavePlayerTeam,
  openPlayerTicket,
  replyToPlayerTicket,
  requestPlayerTeam,
  revokePlayerSession,
  sendPlayerTeamMessage,
  updatePlayerEventAttendance,
  updatePlayerGame,
  updatePlayerMatchAttendance,
  updatePlayerSettings,
  updatePlayerWorkspaceProfile,
  startPlayerTwoFactor,
  logoutPlayerSession
} from "../services/playerWorkspace.service.js";

export async function workspace(req, res) { return handle(res, () => getPlayerWorkspace(req.user, req.query.team_id ? Number(req.query.team_id) : null)); }
export async function publicProfile(req, res) { return handle(res, () => getPublicPlayerProfile(req.params.slug)); }
export async function teamSearch(req, res) { return handle(res, () => getPlayerTeamSearch(req.user, { query: req.query.q, game_id: req.query.game_id, region: req.query.region, recruiting: req.query.recruiting !== "false" })); }
export async function profile(req, res) { return handle(res, () => updatePlayerWorkspaceProfile(req.user, req.body)); }
export async function game(req, res) { return handle(res, () => updatePlayerGame(req.user, { ...req.body, game_id: Number(req.params.gameId) })); }
export async function requestTeam(req, res) { return handle(res, () => requestPlayerTeam(req.user, Number(req.params.teamId), req.body), 201); }
export async function cancelRequest(req, res) { return handle(res, () => cancelPlayerTeamRequest(req.user, Number(req.params.requestId))); }
export async function invite(req, res) { return handle(res, () => answerPlayerInvite(req.user, Number(req.params.requestId), req.params.action)); }
export async function matchAttendance(req, res) { return handle(res, () => updatePlayerMatchAttendance(req.user, Number(req.params.matchId), req.body)); }
export async function matchRoom(req, res) { return handle(res, () => getPlayerMatchRoom(req.user, Number(req.params.matchId), req.query.team_id ? Number(req.query.team_id) : null)); }
export async function eventAttendance(req, res) { return handle(res, () => updatePlayerEventAttendance(req.user, Number(req.params.eventId), req.body)); }
export async function teamMessage(req, res) { return handle(res, () => sendPlayerTeamMessage(req.user, req.body), 201); }
export async function ticket(req, res) { return handle(res, () => openPlayerTicket(req.user, req.body), 201); }
export async function ticketReply(req, res) { return handle(res, () => replyToPlayerTicket(req.user, Number(req.params.ticketId), req.body), 201); }
export async function settings(req, res) { return handle(res, () => updatePlayerSettings(req.user, req.body)); }
export async function password(req, res) { return handle(res, () => changePlayerPassword(req.user, req.body)); }
export async function leaveTeam(req, res) { return handle(res, () => leavePlayerTeam(req.user, req.body)); }
export async function setupTwoFactor(req, res) { return handle(res, () => startPlayerTwoFactor(req.user)); }
export async function confirmTwoFactor(req, res) { return handle(res, () => confirmPlayerTwoFactor(req.user, req.body)); }
export async function disableTwoFactor(req, res) { return handle(res, () => disablePlayerTwoFactor(req.user, req.body)); }
export async function revokeSession(req, res) { return handle(res, () => revokePlayerSession(req.user, req.params.sessionId)); }
export async function logoutSession(req, res) { return handle(res, () => logoutPlayerSession(req.user)); }

async function handle(res, action, successStatus = 200) {
  try {
    return res.status(successStatus).json(await action());
  } catch (error) {
    return res.status(error.status ?? 400).json({ erro: error.message });
  }
}
