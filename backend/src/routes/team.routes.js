import { Router } from "express";

import {create, members}

from "../controllers/team.controller.js";

import {auth}

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Criar equipe
 */
router.post( "/", auth, create);

/**
 * Listar membros
 */
router.get("/:id/members", auth, members);

export default router;