import { Router } from "express";

import {
  create,
  index,
  show,
  update,
  destroy
} from "../controllers/player.controller.js";

import {
  auth
} from "../middleware/auth.middleware.js";
import { role } from "../middleware/role.middleware.js";
import { requireVerifiedEmail } from "../middleware/verified.middleware.js";
import {
  cancelRequest,
  confirmTwoFactor,
  disableTwoFactor,
  eventAttendance,
  game,
  invite,
  leaveTeam,
  matchAttendance,
  matchRoom,
  password,
  publicProfile,
  profile,
  requestTeam,
  revokeSession,
  settings,
  teamMessage,
  teamSearch,
  ticket,
  ticketReply,
  workspace,
  setupTwoFactor,
  logoutSession
} from "../controllers/playerWorkspace.controller.js";

const router = Router();

const playerOnly = [auth, role("jogador"), requireVerifiedEmail];

router.get("/public/:slug", publicProfile);
router.get("/workspace", ...playerOnly, workspace);
router.get("/teams/search", ...playerOnly, teamSearch);
router.put("/workspace/profile", ...playerOnly, profile);
router.put("/workspace/games/:gameId", ...playerOnly, game);
router.post("/workspace/teams/:teamId/request", ...playerOnly, requestTeam);
router.delete("/workspace/requests/:requestId", ...playerOnly, cancelRequest);
router.post("/workspace/invites/:requestId/:action", ...playerOnly, invite);
router.put("/workspace/matches/:matchId/attendance", ...playerOnly, matchAttendance);
router.get("/workspace/matches/:matchId/room", ...playerOnly, matchRoom);
router.put("/workspace/events/:eventId/attendance", ...playerOnly, eventAttendance);
router.post("/workspace/messages/team", ...playerOnly, teamMessage);
router.post("/workspace/tickets", ...playerOnly, ticket);
router.post("/workspace/tickets/:ticketId/replies", ...playerOnly, ticketReply);
router.put("/workspace/settings", ...playerOnly, settings);
router.put("/workspace/password", ...playerOnly, password);
router.post("/workspace/team/leave", ...playerOnly, leaveTeam);
router.post("/workspace/security/2fa/setup", ...playerOnly, setupTwoFactor);
router.post("/workspace/security/2fa/confirm", ...playerOnly, confirmTwoFactor);
router.post("/workspace/security/2fa/disable", ...playerOnly, disableTwoFactor);
router.delete("/workspace/security/sessions/:sessionId", ...playerOnly, revokeSession);
router.post("/workspace/security/logout", ...playerOnly, logoutSession);

router.post(
  "/create",
  auth,
  create
);

router.get(
  "/all",
  auth,
  index
);

router.get(
  "/:id",
  auth,
  show
);

router.put(
  "/:id",
  auth,
  update
);

router.delete(
  "/:id",
  auth,
  destroy
);

export default router;
