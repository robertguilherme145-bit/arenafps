import { Router } from "express";

import { me }

from "../controllers/dashboard.controller.js";

import { auth }

from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Dashboard
 */
router.get("/", auth, me);

export default router;