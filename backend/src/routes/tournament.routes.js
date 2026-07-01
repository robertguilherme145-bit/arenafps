import { Router } from "express";

import {
 registerTournament,
 getTournament,
 subscribeTournament
}

from "../controllers/tournament.controller.js";

const router=
Router();

router.post(
 "/create",
 registerTournament
);

router.get(
 "/all",
 getTournament
);

router.post(
 "/subscribe",
 subscribeTournament
);

export default router;