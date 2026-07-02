import { Router } from "express";

import {create, index, show}

from "../controllers/game.controller.js";

import {auth}

from "../middleware/auth.middleware.js";

import {role}

from "../middleware/role.middleware.js";

const router = Router();

/**
 * Criar Game
 * Apenas Admin
 */
router.post(

    "/",

    auth,

    role("admin"),

    create

);

/**
 * Listar Games
 */
router.get(

    "/",

    index

);

/**
 * Buscar Game
 */
router.get(

    "/:id",

    show

);

export default router;