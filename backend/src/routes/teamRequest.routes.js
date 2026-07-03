import { Router } from "express";

import {request, index, accept} from "../controllers/teamRequest.controller.js";

import {auth} from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Solicitar entrada na equipe
 */
router.post("/request/:teamId", auth, request);

/**
 * Listar solicitações
 */
router.get("/:teamId", auth, index);

/**
 * Aceitar solicitação
 */
router.patch("/:id/accept", auth, accept);

export default router;