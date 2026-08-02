import { Router } from "express";

import { myNotifications, readNotification, readAllNotifications, removeNotification, removeAllNotifications }

from "../controllers/notification.controller.js";

import { auth }

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Minhas notificações
 */
router.get("/", auth, myNotifications);
router.patch("/read-all", auth, readAllNotifications);
router.patch("/:id/read", auth, readNotification);
router.delete("/:id", auth, removeNotification);
router.delete("/", auth, removeAllNotifications);

export default router;
