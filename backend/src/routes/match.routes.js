import { Router } from "express";

import { create, index, result }

from "../controllers/match.controller.js";

import { auth }

from "../middleware/auth.middleware.js";

import { role }

from "../middleware/role.middleware.js";

const router = Router();

/**
 * Criar partida
 * Apenas Admin
 */
router.post("/", auth, role("admin"), create);

/**
 * Partidas do torneio
 */
router.get("/tournament/:id", index);

/**
 * Finalizar partida
 * Apenas Admin
 */
router.patch("/:id/result", auth, role("admin"), result);

export default router;