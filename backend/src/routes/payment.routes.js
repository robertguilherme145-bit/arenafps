import { Router } from "express";

import {

    webhook

}

from "../controllers/payment.controller.js";

const router = Router();

router.post(

    "/webhook",

    webhook

);

export default router;