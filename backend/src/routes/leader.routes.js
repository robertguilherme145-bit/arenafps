import { Router } from "express";
import { auth } from "../middleware/auth.middleware.js";
import { role } from "../middleware/role.middleware.js";
import { requireVerifiedEmail } from "../middleware/verified.middleware.js";
import {
  createEntry,
  competitionRequest,
  createEvent,
  createLineup,
  createPayment,
  deleteEvent,
  eventAttendance,
  dispute,
  document,
  duplicateLineup,
  freezeLineup,
  invite,
  match,
  preferences,
  removeMember,
  requestDecision,
  syncPayments,
  teamMessage,
  ticket,
  tournamentMessage,
  tournamentCenter,
  transfer,
  updateLineup,
  updateMember,
  updateTeam,
  archiveTeam,
  veto,
  workspace
} from "../controllers/leader.controller.js";

const router = Router();
router.use(auth, role("lider"), requireVerifiedEmail);

router.get("/workspace", workspace);
router.put("/team", updateTeam);
router.put("/team/archive", archiveTeam);
router.post("/invitations", invite);
router.patch("/requests/:id", requestDecision);
router.patch("/members/:id", updateMember);
router.post("/members/:id/transfer", transfer);
router.delete("/members/:id", removeMember);
router.post("/lineups", createLineup);
router.put("/lineups/:id", updateLineup);
router.post("/lineups/:id/duplicate", duplicateLineup);
router.post("/lineups/:id/freeze", freezeLineup);
router.post("/entries", createEntry);
router.post("/payments/sync", syncPayments);
router.post("/payments/:entryId", createPayment);
router.get("/tournaments/:id/center", tournamentCenter);
router.get("/matches/:id", match);
router.post("/matches/:id/veto", veto);
router.post("/events", createEvent);
router.delete("/events/:id", deleteEvent);
router.put("/events/:id/attendance", eventAttendance);
router.post("/messages/team", teamMessage);
router.post("/messages/tournament/:tournamentId", tournamentMessage);
router.post("/disputes", dispute);
router.post("/tickets", ticket);
router.post("/competition-requests", competitionRequest);
router.post("/documents", document);
router.put("/preferences", preferences);

export default router;
