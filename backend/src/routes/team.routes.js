import { Router } from "express";

import {create, members, me}

from "../controllers/team.controller.js";

import {auth}

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Criar equipe
 */
router.post( "/", auth, create);

/**
 * Minha equipe
 */
router.get("/me", auth, me);

/**
 * Listar membros
 */
router.get("/:id/members", auth, members);



export default router;