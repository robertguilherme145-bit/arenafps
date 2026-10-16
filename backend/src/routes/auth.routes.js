import { Router } from "express";
import { changeForgottenPassword, forgotPassword, loginUser, onboarding, providers, registerUser, resendEmailVerification, verifyEmailAddress } from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import { completeOAuthAccount, exchangeOAuth, oauthCallback, startOAuth, startOAuthLink } from "../controllers/oauth.controller.js";
import { emailLimiter, loginAccountLimiter, loginIpLimiter, loginLimiter, registerLimiter, tokenLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();
router.get("/providers", providers);
router.get("/oauth/:provider", startOAuth);
router.get("/oauth/:provider/callback", oauthCallback);
router.post("/oauth/:provider/link", auth, startOAuthLink);
router.post("/oauth/exchange", tokenLimiter(), exchangeOAuth);
router.post("/register", registerLimiter(), registerUser);
router.post("/login", loginIpLimiter(), loginAccountLimiter(), loginLimiter(), loginUser);
router.post("/verify-email", tokenLimiter(), verifyEmailAddress);
router.post("/resend-verification", emailLimiter(), auth, resendEmailVerification);
router.post("/forgot-password", emailLimiter(), forgotPassword);
router.post("/reset-password", tokenLimiter(), changeForgottenPassword);
router.post("/onboarding", auth, onboarding);
router.post("/oauth/complete-profile", auth, completeOAuthAccount);

export default router;
