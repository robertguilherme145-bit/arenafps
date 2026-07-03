import { Router } from "express";

import {me, update}

from "../controllers/profile.controller.js";

import { auth }

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Meu perfil
 */
router.get("/", auth, me);

/**
 * Atualizar perfil
 */
router.patch("/", auth, update);

export default router;