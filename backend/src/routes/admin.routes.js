import { Router } from "express";
import {
  approveEntry,
  auditLogs,
  cancelEntry,
  createDispute,
  createPenalty,
  createTicket,
  dashboard,
  disputes,
  entries,
  lineup,
  penalties,
  payments,
  players,
  saveLineup,
  sendNotification,
  resolvePenalty,
  teams,
  tickets,
  updateEntryPayment,
  updateDispute,
  updatePayment,
  updatePlayer,
  updateTicket,
  updateTeam
} from "../controllers/admin.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { role } from "../middleware/role.middleware.js";
import { requireVerifiedEmail } from "../middleware/verified.middleware.js";
import { adminMatchMessage } from "../controllers/captain.controller.js";
import {
  createMap,
  closeDiscordRoom,
  discordServerStatus,
  deleteMap,
  deleteGame,
  gameSettings,
  generateStructure,
  games as competitionGames,
  manualMatchMap,
  maps,
  matchMapResult,
  matchMapPlayerStatistics,
  matchPlayerStatistics,
  matchOperations,
  matchRoom,
  openVeto,
  resetVeto,
  syncDiscordServer,
  tournamentCompetition,
  tournamentTeams,
  updateMap,
  updateTournamentCompetition,
  vetoAction
} from "../controllers/competitionSetup.controller.js";
import { create as createAchievement, index as achievements, update as updateAchievement } from "../controllers/achievement.controller.js";
import { contacts as publicContacts, content as publicContent, createContent, updateContact as updatePublicContact, updateContent } from "../controllers/publicPortal.controller.js";
import { ban as banAccessAccount, index as accessAccounts, remove as removeAccessAccount, unban as unbanAccessAccount, update as updateAccessAccount } from "../controllers/accessAdmin.controller.js";
import { upload as uploadMedia } from "../controllers/media.controller.js";
import { uploadImage } from "../middleware/imageUpload.middleware.js";
import { adminIndex as officialTournaments, adminShow as officialTournament, createEvent as createOfficialTournament, createMatch as createOfficialMatch, deleteEvent as deleteOfficialTournament, deleteMatch as deleteOfficialMatch, updateEvent as updateOfficialTournament, updateMatch as updateOfficialMatch } from "../controllers/officialTournament.controller.js";

const router = Router();

router.use(auth, role("admin"), requireVerifiedEmail);
router.post("/media/images", uploadImage, uploadMedia);

router.get("/dashboard", dashboard);
router.get("/achievements", achievements);
router.post("/achievements", createAchievement);
router.put("/achievements/:id", updateAchievement);
router.get("/public-content", publicContent);
router.post("/public-content", createContent);
router.put("/public-content/:id", updateContent);
router.get("/public-contacts", publicContacts);
router.put("/public-contacts/:id", updatePublicContact);
router.get("/official-tournaments",officialTournaments);
router.get("/official-tournaments/:id",officialTournament);
router.post("/official-tournaments",createOfficialTournament);
router.put("/official-tournaments/:id",updateOfficialTournament);
router.delete("/official-tournaments/:id",deleteOfficialTournament);
router.post("/official-tournaments/:id/matches",createOfficialMatch);
router.put("/official-tournaments/:id/matches/:matchId",updateOfficialMatch);
router.delete("/official-tournaments/:id/matches/:matchId",deleteOfficialMatch);
router.get("/access-accounts", accessAccounts);
router.put("/access-accounts/:id", updateAccessAccount);
router.patch("/access-accounts/:id/ban", banAccessAccount);
router.delete("/access-accounts/:id/ban", unbanAccessAccount);
router.delete("/access-accounts/:id", removeAccessAccount);
router.get("/competition/games", competitionGames);
router.put("/competition/games/:gameId/settings", gameSettings);
router.delete("/competition/games/:gameId", deleteGame);
router.get("/competition/games/:gameId/maps", maps);
router.post("/competition/games/:gameId/maps", createMap);
router.put("/competition/maps/:mapId", updateMap);
router.delete("/competition/maps/:mapId", deleteMap);

router.get("/competition/tournaments/:tournamentId", tournamentCompetition);
router.put("/competition/tournaments/:tournamentId", updateTournamentCompetition);
router.post("/competition/tournaments/:tournamentId/structure", generateStructure);
router.get("/competition/tournaments/:tournamentId/teams", tournamentTeams);

router.get("/competition/matches/:matchId", matchOperations);
router.put("/competition/matches/:matchId/room", matchRoom);
router.delete("/competition/matches/:matchId/discord-room", closeDiscordRoom);
router.get("/integrations/discord", discordServerStatus);
router.post("/integrations/discord/setup", syncDiscordServer);
router.post("/competition/matches/:matchId/messages", adminMatchMessage);
router.post("/competition/matches/:matchId/veto/open", openVeto);
router.post("/competition/matches/:matchId/veto/reset", resetVeto);
router.post("/competition/matches/:matchId/veto/actions", vetoAction);
router.post("/competition/matches/:matchId/maps", manualMatchMap);
router.patch("/competition/match-maps/:matchMapId/result", matchMapResult);
router.put("/competition/matches/:matchId/maps/:matchMapId/player-stats", matchMapPlayerStatistics);
router.put("/competition/matches/:matchId/player-stats", matchPlayerStatistics);
router.get("/entries", entries);
router.patch("/entries/:id/approve", approveEntry);
router.patch("/entries/:id/cancel", cancelEntry);
router.patch("/entries/:id/payment", updateEntryPayment);
router.get("/entries/:entryId/lineup", lineup);
router.put("/entries/:entryId/lineup", saveLineup);

router.get("/payments", payments);
router.patch("/payments/:id/status", updatePayment);

router.get("/teams", teams);
router.put("/teams/:id", updateTeam);

router.get("/players", players);
router.put("/players/:id", updatePlayer);

router.get("/penalties", penalties);
router.post("/penalties", createPenalty);
router.patch("/penalties/:id/resolve", resolvePenalty);

router.get("/tickets", tickets);
router.post("/tickets", createTicket);
router.patch("/tickets/:id", updateTicket);

router.get("/disputes", disputes);
router.post("/disputes", createDispute);
router.patch("/disputes/:id", updateDispute);

router.post("/notifications", sendNotification);
router.get("/audit-logs", auditLogs);

export default router;
