import { Router } from "express";

import {

  create,

  index,

  show,

  update,

  changeStatus,

  ranking,

  statistics

}

from "../controllers/tournament.controller.js";

import { auth, optionalAuth } from "../middleware/auth.middleware.js";

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

  optionalAuth,

  index

);

/**
 * Buscar torneio
 */
router.get(

  "/:id",

  optionalAuth,

  show

);

/**
 * Ranking calculado do torneio
 */
router.get(

  "/:id/ranking",

  optionalAuth,

  ranking

);

/**
 * Estatisticas calculadas do torneio
 */
router.get(

  "/:id/statistics",

  optionalAuth,

  statistics

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
