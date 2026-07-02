import { Router } from "express";

import authRoutes from "./auth.routes.js";
import clanRoutes from "./clan.routes.js";
import tournamentRoutes from "./tournament.routes.js";
import playerRoutes from "./player.routes.js";
import entryRoutes from "./entry.routes.js";
import entryPlayerRoutes from "./entryPlayer.routes.js";
import paymentRoutes from "./payment.routes.js";


const router=Router();

router.get("/",(req,res)=>{

 res.json({

  nome:"Arena Camp API",

  status:"online"

 });

});

router.use("/auth", authRoutes);
router.use("/clan", clanRoutes);
router.use("/player", playerRoutes);
router.use("/tournament", tournamentRoutes);
router.use("/entry", entryRoutes);
router.use("/entry-player", entryPlayerRoutes);
router.use("/payment", paymentRoutes)

export default router;