import { Router } from "express";
import { adminDetails, adminRegistration, configure, details, draw, index, join, leave, payment } from "../controllers/mixTournament.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { role } from "../middleware/role.middleware.js";
import { requireVerifiedEmail } from "../middleware/verified.middleware.js";

const router=Router();
router.use(auth,requireVerifiedEmail);
router.get("/",index);
router.get("/:id",details);
router.post("/:id/register",join);
router.delete("/:id/register",leave);
router.post("/:id/payment",payment);
router.get("/admin/:id",role("admin"),adminDetails);
router.put("/admin/:id",role("admin"),configure);
router.post("/admin/:id/draw",role("admin"),draw);
router.patch("/admin/:id/registrations/:registrationId",role("admin"),adminRegistration);
export default router;
