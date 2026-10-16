import { Router } from "express";
import { create } from "../controllers/team.controller.js";
import { auth } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Criar equipe
 * As demais rotas antigas de /team foram removidas: o gerenciamento
 * de membros acontece em /leader e /captain, que verificam o cargo.
 */
router.post("/", auth, create);

export default router;
