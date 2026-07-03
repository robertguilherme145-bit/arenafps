import { Router } from "express";

import authRoutes from "./auth.routes.js";
import clanRoutes from "./clan.routes.js";
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

const router=Router();

router.get("/",(req,res)=>{res.json({nome:"Arena Camp API", status:"online"});});

router.use("/auth", authRoutes);
router.use("/clan", clanRoutes);
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

export default router;