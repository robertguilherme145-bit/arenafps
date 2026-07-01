import { Router } from "express";

import {

 registerTournament,

 getTournament,

 subscribeTournament,

 approveTournament

}


from "../controllers/tournament.controller.js";

import {
 auth
}
from "../middleware/auth.middleware.js";

import {
 role
}
from "../middleware/role.middleware.js";

const router=Router();

router.post(

 "/create",

 auth,

 role(

  "admin"

 ),

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