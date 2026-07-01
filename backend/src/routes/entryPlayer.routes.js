import { Router } from "express";

import {

  create,

  index,

  remove,

  save

}

from "../controllers/entryPlayer.controller.js";

import {

  auth

}

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Salvar elenco completo
 */
router.post(

  "/lineup/:entryId",

  auth,

  save

);

/**
 * Adicionar jogador
 */
router.post(

  "/",

  auth,

  create

);

/**
 * Listar jogadores
 */
router.get(

  "/:entryId",

  auth,

  index

);

/**
 * Remover jogador
 */
router.delete(

  "/:entryId/:playerId",

  auth,

  remove

);

export default router;