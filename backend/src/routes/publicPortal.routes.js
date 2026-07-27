import { Router } from "express";
import { contact, portal, search, team, tournament } from "../controllers/publicPortal.controller.js";
const router=Router();
router.get("/portal",portal);
router.get("/search",search);
router.get("/tournaments/:id",tournament);
router.get("/teams/:slug",team);
router.post("/contact",contact);
export default router;
