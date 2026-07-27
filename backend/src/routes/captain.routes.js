import { Router } from "express";
import { auth } from "../middleware/auth.middleware.js";
import { role } from "../middleware/role.middleware.js";
import { requireVerifiedEmail } from "../middleware/verified.middleware.js";
import {
  dispute,
  eventAttendance,
  invite,
  leaveTeam,
  match,
  matchAttendance,
  matchMessage,
  preferences,
  removeMember,
  resultConfirmation,
  teamMessage,
  tournamentCenter,
  veto,
  workspace
} from "../controllers/captain.controller.js";

const router = Router();
router.use(auth, role("capitao"), requireVerifiedEmail);

router.get("/workspace", workspace);
router.get("/matches/:id", match);
router.put("/matches/:id/attendance", matchAttendance);
router.post("/matches/:id/veto", veto);
router.post("/matches/:id/result-confirmation", resultConfirmation);
router.post("/matches/:id/messages", matchMessage);
router.post("/messages/team", teamMessage);
router.post("/disputes", dispute);
router.get("/tournaments/:id/center", tournamentCenter);
router.put("/events/:id/attendance", eventAttendance);
router.put("/preferences", preferences);
router.post("/invitations", invite);
router.delete("/members/:id", removeMember);
router.post("/team/leave", leaveTeam);

export default router;
