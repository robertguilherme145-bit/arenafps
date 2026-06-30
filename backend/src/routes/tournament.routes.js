import { Router } from "express";

import {

 registerTournament,

 getTournament

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

export default router;