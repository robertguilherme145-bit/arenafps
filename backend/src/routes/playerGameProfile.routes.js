import { Router } from "express";

import {
    myGames,
    create
}

from "../controllers/playerGameProfile.controller.js";

import { auth }

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Listar meus jogos
 */
router.get("/", auth, myGames);

/**
 * Adicionar jogo
 */
router.post("/", auth, create);

export default router;