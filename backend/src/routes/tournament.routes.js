import { Router } from "express";

import {

 registerTournament,

 getTournament,

 subscribeTournament,

 approveTournament

}

from "../controllers/tournament.controller.js";

const router=Router();

router.post(
 "/create",
 registerTournament
);

router.post(
 "/subscribe",
 subscribeTournament
);

router.post(
 "/approve",
 approveTournament
);

router.get(
 "/all",
 getTournament
);

export default router;