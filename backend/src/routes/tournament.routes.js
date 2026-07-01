import { Router } from "express";

import {

  create,

  index,

  show,

  update,

  changeStatus

}

from "../controllers/tournament.controller.js";

import {

  auth

}

from "../middleware/auth.middleware.js";

import {

  role

}

from "../middleware/role.middleware.js";

const router = Router();

/**
 * Criar torneio
 * Apenas Admin
 */
router.post(

  "/create",

  auth,

  role("admin"),

  create

);

/**
 * Listar torneios
 */
router.get(

  "/all",

  index

);

/**
 * Buscar torneio
 */
router.get(

  "/:id",

  show

);

/**
 * Editar torneio
 */
router.put(

  "/:id",

  auth,

  role("admin"),

  update

);

/**
 * Alterar status
 */
router.patch(

  "/:id/status",

  auth,

  role("admin"),

  changeStatus

);

export default router;