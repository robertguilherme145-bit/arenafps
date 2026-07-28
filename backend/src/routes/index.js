import { Router } from "express";

import authRoutes from "./auth.routes.js";
import tournamentRoutes from "./tournament.routes.js";
import playerRoutes from "./player.routes.js";
import entryRoutes from "./entry.routes.js";
import entryPlayerRoutes from "./entryPlayer.routes.js";
import paymentRoutes from "./payment.routes.js";
import gameRoutes from "./game.routes.js";
import teamRoutes from "./team.routes.js";
import teamRequestRoutes from "./teamRequest.routes.js";
import profileRoutes from "./profile.routes.js";
import playerGameProfileRoutes from "./playerGameProfile.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import notificationRoutes from "./notification.routes.js";
import matchRoutes from "./match.routes.js";
import adminRoutes from "./admin.routes.js";
import leaderRoutes from "./leader.routes.js";
import captainRoutes from "./captain.routes.js";
import identityRoutes from "./identity.routes.js";
import publicPortalRoutes from "./publicPortal.routes.js";
import mediaRoutes from "./media.routes.js";
import mixTournamentRoutes from "./mixTournament.routes.js";

const router=Router();

router.get("/api/health",(req,res)=>{res.json({nome:"Arena Camp API",status:"online",environment:process.env.NODE_ENV||"development"});});

router.use("/auth", authRoutes);
router.use("/player", playerRoutes);
router.use("/tournament", tournamentRoutes);
router.use("/entry", entryRoutes);
router.use("/entry-player", entryPlayerRoutes);
router.use("/payment", paymentRoutes)
router.use("/game", gameRoutes);
router.use("/team", teamRoutes);
router.use("/team-request", teamRequestRoutes);
router.use("/profile", profileRoutes);
router.use("/player-game-profile", playerGameProfileRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);
router.use("/match", matchRoutes);
router.use("/admin", adminRoutes);
router.use("/leader", leaderRoutes);
router.use("/captain", captainRoutes);
router.use("/identity", identityRoutes);
router.use("/public", publicPortalRoutes);
router.use("/media", mediaRoutes);
router.use("/mix", mixTournamentRoutes);

export default router;
