import { Router } from "express";
import { auth } from "../middleware/auth.middleware.js";
import { context, games, me } from "../controllers/identity.controller.js";

const router = Router();
router.use(auth);
router.get("/me", me);
router.put("/context", context);
router.put("/games", games);
export default router;
