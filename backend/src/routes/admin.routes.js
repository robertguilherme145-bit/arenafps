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
  deleteMap,
  gameSettings,
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
  tournamentCompetition,
  tournamentTeams,
  updateMap,
  updateTournamentCompetition,
  vetoAction
} from "../controllers/competitionSetup.controller.js";
import { create as createAchievement, index as achievements, update as updateAchievement } from "../controllers/achievement.controller.js";
import { contacts as publicContacts, content as publicContent, createContent, updateContact as updatePublicContact, updateContent } from "../controllers/publicPortal.controller.js";
import { index as accessAccounts, update as updateAccessAccount } from "../controllers/accessAdmin.controller.js";
import { upload as uploadMedia } from "../controllers/media.controller.js";
import { uploadImage } from "../middleware/imageUpload.middleware.js";

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
router.get("/access-accounts", accessAccounts);
router.put("/access-accounts/:id", updateAccessAccount);
router.get("/competition/games", competitionGames);
router.put("/competition/games/:gameId/settings", gameSettings);
router.get("/competition/games/:gameId/maps", maps);
router.post("/competition/games/:gameId/maps", createMap);
router.put("/competition/maps/:mapId", updateMap);
router.delete("/competition/maps/:mapId", deleteMap);

router.get("/competition/tournaments/:tournamentId", tournamentCompetition);
router.put("/competition/tournaments/:tournamentId", updateTournamentCompetition);
router.get("/competition/tournaments/:tournamentId/teams", tournamentTeams);

router.get("/competition/matches/:matchId", matchOperations);
router.put("/competition/matches/:matchId/room", matchRoom);
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
