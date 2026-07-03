import { Router } from "express";

import {create, index, show, approve, payment}

from "../controllers/entry.controller.js";

import {auth}

from "../middleware/auth.middleware.js";

import {role}

from "../middleware/role.middleware.js";

const router = Router();

/**
 * Líder cria inscrição
 */
router.post("/create", auth, create);

/**
 * Líder vê suas inscrições
 */
router.get("/my", auth, index);

/**
 * Buscar inscrição
 */
router.get("/:id", auth, show);

/**
 * Admin confirma inscrição
 */
router.patch("/:id/approve", auth, role("admin"), approve);

/**
 * Admin confirma pagamento
 */
router.patch("/:id/payment", auth, role("admin"), payment);

export default router;