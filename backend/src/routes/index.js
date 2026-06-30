import { Router } from "express";

import authRoutes from "./auth.routes.js";
import clanRoutes from "./clan.routes.js";
import tournamentRoutes from "./tournament.routes.js";
const router=Router();

router.get("/",(req,res)=>{

 res.json({

  nome:"Arena Camp API",

  status:"online"

 });

});

router.use(
 "/auth",
 authRoutes
);

router.use(
 "/clan",
 clanRoutes
);

router.use(
 "/tournament",
 tournamentRoutes
);

export default router;