import { Router } from "express";
import { changeForgottenPassword, forgotPassword, loginUser, onboarding, providers, registerUser, resendEmailVerification, verifyEmailAddress } from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { completeOAuthAccount, exchangeOAuth, oauthCallback, startOAuth } from "../controllers/oauth.controller.js";

const router = Router();
router.get("/providers", providers);
router.get("/oauth/:provider", startOAuth);
router.get("/oauth/:provider/callback", oauthCallback);
router.post("/oauth/exchange", exchangeOAuth);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-email", verifyEmailAddress);
router.post("/resend-verification", auth, resendEmailVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", changeForgottenPassword);
router.post("/onboarding", auth, onboarding);
router.post("/oauth/complete-profile", auth, completeOAuthAccount);

export default router;
