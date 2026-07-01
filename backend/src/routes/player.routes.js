import { Router } from "express";

import {
  create,
  index,
  show,
  update,
  destroy
} from "../controllers/player.controller.js";

import {
  auth
} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/create",
  auth,
  create
);

router.get(
  "/all",
  auth,
  index
);

router.get(
  "/:id",
  auth,
  show
);

router.put(
  "/:id",
  auth,
  update
);

router.delete(
  "/:id",
  auth,
  destroy
);

export default router;