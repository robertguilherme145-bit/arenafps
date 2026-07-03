import { Router } from "express";

import {create, members, me, show, changeRole, transfer}

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

router.patch("/member/:id", auth, changeRole);

router.patch("/transfer-leader/:id", auth, transfer);

router.get("/:id", auth, show);



export default router;