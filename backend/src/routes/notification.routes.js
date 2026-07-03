import { Router } from "express";

import { myNotifications }

from "../controllers/notification.controller.js";

import { auth }

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Minhas notificações
 */
router.get("/", auth, myNotifications);

export default router;