import { Router } from "express";

import {

    webhook

}

from "../controllers/payment.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { getPaymentSettings } from "../services/paymentSettings.service.js";

const router = Router();

router.post(

    "/webhook",

    webhook

);

// Para quem vai pagar: a forma de recebimento atual e a quem o PIX proprio e destinado.
router.get("/info", auth, async (req, res) => {
    try {
        const settings = await getPaymentSettings();
        return res.json({ mode:settings.mode, receiver_name:settings.mode === "pix_manual" ? settings.receiver_name || null : null, instructions:settings.mode === "pix_manual" ? settings.instructions || null : null });
    }
    catch (error) { return res.status(400).json({ erro:error.message }); }
});

export default router;