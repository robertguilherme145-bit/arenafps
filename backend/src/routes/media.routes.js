import { Router } from "express";
import { upload as uploadMedia } from "../controllers/media.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { uploadImage } from "../middleware/imageUpload.middleware.js";
import { requireVerifiedEmail } from "../middleware/verified.middleware.js";

const router = Router();
router.post("/images", auth, requireVerifiedEmail, uploadImage, uploadMedia);

export default router;
