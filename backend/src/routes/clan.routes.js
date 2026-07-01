import { Router } from "express";

import {

  create,

  index

}

from "../controllers/clan.controller.js";

import {

  auth

}

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Criar clã
 * Apenas líder autenticado
 */
router.post(

  "/create",

  auth,

  create

);

/**
 * Listar clãs
 */
router.get(

  "/all",

  index

);

export default router;