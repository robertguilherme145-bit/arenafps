import {
  addLeaderDocument,
  addLeaderEvent,
  archiveLeaderTeam,
  createLeaderPayment,
  deleteLeaderMember,
  duplicateLeaderLineup,
  freezeLeaderLineup,
  getLeaderMatch,
  getLeaderTournamentCenter,
  getLeaderWorkspace,
  inviteLeaderPlayer,
  openLeaderDispute,
  openLeaderCompetitionRequest,
  openLeaderTicket,
  performLeaderVeto,
  registerLeaderEntry,
  removeLeaderEvent,
  respondLeaderRequest,
  respondLeaderEventAttendance,
  saveLeaderLineupConfiguration,
  saveLeaderMember,
  saveLeaderTeam,
  sendLeaderTeamMessage,
  sendLeaderTournamentMessage,
  syncLeaderPayments,
  transferLeaderTeam,
  updateLeaderPreferences
} from "../services/leader.service.js";

export async function workspace(req, res) { return handle(res, () => getLeaderWorkspace(req.user)); }
export async function updateTeam(req, res) { return handle(res, () => saveLeaderTeam(req.user, req.body)); }
export async function archiveTeam(req, res) { return handle(res, () => archiveLeaderTeam(req.user, req.body)); }
export async function invite(req, res) { return handle(res, () => inviteLeaderPlayer(req.user, req.body), 201); }
export async function requestDecision(req, res) { return handle(res, () => respondLeaderRequest(req.user, req.params.id, req.body.action)); }
export async function updateMember(req, res) { return handle(res, () => saveLeaderMember(req.user, req.params.id, req.body)); }
export async function transfer(req, res) { return handle(res, () => transferLeaderTeam(req.user, req.params.id)); }
export async function removeMember(req, res) { return handle(res, () => deleteLeaderMember(req.user, req.params.id)); }
export async function createLineup(req, res) { return handle(res, () => saveLeaderLineupConfiguration(req.user, null, req.body), 201); }
export async function updateLineup(req, res) { return handle(res, () => saveLeaderLineupConfiguration(req.user, req.params.id, req.body)); }
export async function duplicateLineup(req, res) { return handle(res, () => duplicateLeaderLineup(req.user, req.params.id), 201); }
export async function freezeLineup(req, res) { return handle(res, () => freezeLeaderLineup(req.user, req.params.id)); }
export async function createEntry(req, res) { return handle(res, () => registerLeaderEntry(req.user, req.body), 201); }
export async function createPayment(req, res) { return handle(res, () => createLeaderPayment(req.user, req.params.entryId), 201); }
export async function syncPayments(req, res) { return handle(res, () => syncLeaderPayments(req.user)); }
export async function tournamentCenter(req, res) { return handle(res, () => getLeaderTournamentCenter(req.user, req.params.id)); }
export async function match(req, res) { return handle(res, () => getLeaderMatch(req.user, req.params.id)); }
export async function veto(req, res) { return handle(res, () => performLeaderVeto(req.user, req.params.id, req.body)); }
export async function createEvent(req, res) { return handle(res, () => addLeaderEvent(req.user, req.body), 201); }
export async function deleteEvent(req, res) { return handle(res, () => removeLeaderEvent(req.user, req.params.id)); }
export async function eventAttendance(req, res) { return handle(res, () => respondLeaderEventAttendance(req.user, req.params.id, req.body)); }
export async function teamMessage(req, res) { return handle(res, () => sendLeaderTeamMessage(req.user, req.body), 201); }
export async function tournamentMessage(req, res) { return handle(res, () => sendLeaderTournamentMessage(req.user, req.params.tournamentId, req.body), 201); }
export async function dispute(req, res) { return handle(res, () => openLeaderDispute(req.user, req.body), 201); }
export async function ticket(req, res) { return handle(res, () => openLeaderTicket(req.user, req.body), 201); }
export async function competitionRequest(req, res) { return handle(res, () => openLeaderCompetitionRequest(req.user, req.body), 201); }
export async function document(req, res) { return handle(res, () => addLeaderDocument(req.user, req.body), 201); }
export async function preferences(req, res) { return handle(res, () => updateLeaderPreferences(req.user, req.body)); }

async function handle(res, action, successStatus = 200) {
  try {
    return res.status(successStatus).json(await action());
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}
