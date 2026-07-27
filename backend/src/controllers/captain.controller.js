import {
  confirmCaptainResult,
  getCaptainMatchRoom,
  getCaptainTournamentCenter,
  getCaptainWorkspace,
  inviteCaptainPlayer,
  leaveCaptainTeam,
  openCaptainDispute,
  performCaptainVeto,
  removeCaptainPlayer,
  respondCaptainEventAttendance,
  respondCaptainMatchAttendance,
  sendAdminMatchMessage,
  sendCaptainMatchMessage,
  sendCaptainTeamMessage,
  updateCaptainPreferences
} from "../services/captain.service.js";

export async function workspace(req, res) { return handle(res, () => getCaptainWorkspace(req.user)); }
export async function match(req, res) { return handle(res, () => getCaptainMatchRoom(req.user, req.params.id)); }
export async function matchAttendance(req, res) { return handle(res, () => respondCaptainMatchAttendance(req.user, req.params.id, req.body)); }
export async function veto(req, res) { return handle(res, () => performCaptainVeto(req.user, req.params.id, req.body)); }
export async function resultConfirmation(req, res) { return handle(res, () => confirmCaptainResult(req.user, req.params.id, req.body)); }
export async function matchMessage(req, res) { return handle(res, () => sendCaptainMatchMessage(req.user, req.params.id, req.body), 201); }
export async function adminMatchMessage(req, res) { return handle(res, () => sendAdminMatchMessage(req.user, req.params.matchId, req.body), 201); }
export async function teamMessage(req, res) { return handle(res, () => sendCaptainTeamMessage(req.user, req.body), 201); }
export async function dispute(req, res) { return handle(res, () => openCaptainDispute(req.user, req.body), 201); }
export async function tournamentCenter(req, res) { return handle(res, () => getCaptainTournamentCenter(req.user, req.params.id)); }
export async function eventAttendance(req, res) { return handle(res, () => respondCaptainEventAttendance(req.user, req.params.id, req.body)); }
export async function preferences(req, res) { return handle(res, () => updateCaptainPreferences(req.user, req.body)); }
export async function invite(req, res) { return handle(res, () => inviteCaptainPlayer(req.user, req.body), 201); }
export async function removeMember(req, res) { return handle(res, () => removeCaptainPlayer(req.user, req.params.id)); }
export async function leaveTeam(req, res) { return handle(res, () => leaveCaptainTeam(req.user, req.body)); }

async function handle(res, action, successStatus = 200) {
  try { return res.status(successStatus).json(await action()); }
  catch (error) { return res.status(400).json({ erro: error.message }); }
}
