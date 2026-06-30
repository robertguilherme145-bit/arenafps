import { Router } from "express";

import {

 registerClan,

 listClans,

 registerPlayer

}

from "../controllers/clan.controller.js";

const router=
Router();

router.post(
 "/create",
 registerClan
);

router.post(
 "/player",
 registerPlayer
);

router.get(
 "/all",
 listClans
);

export default router;