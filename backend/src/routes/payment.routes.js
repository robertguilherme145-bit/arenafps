import { Router } from "express";

import {

    create,
    webhook

}

from "../controllers/payment.controller.js";

import {

    auth

}

from "../middleware/auth.middleware.js";

const router = Router();

router.post(

    "/create/:entryId",

    auth,

    create

);

router.post(

    "/webhook",

    webhook

);

export default router;