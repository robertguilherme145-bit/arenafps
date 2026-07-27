import { authProviders, completeOnboarding, login, register, requestPasswordReset, resendVerification, resetPassword, verifyEmail } from "../services/auth.service.js";

export async function registerUser(req, res) { return respond(res, () => register(req.body), 201); }
export async function loginUser(req, res) { return respond(res, () => login(req.body, { user_agent:req.get("user-agent"), ip_address:req.ip })); }
export async function verifyEmailAddress(req, res) { return respond(res, () => verifyEmail(req.body.token)); }
export async function resendEmailVerification(req, res) { return respond(res, () => resendVerification(req.user)); }
export async function forgotPassword(req, res) { return respond(res, () => requestPasswordReset(req.body.email)); }
export async function changeForgottenPassword(req, res) { return respond(res, () => resetPassword(req.body.token, req.body.password)); }
export async function onboarding(req, res) { return respond(res, () => completeOnboarding(req.user, req.body.role)); }
export function providers(req, res) { return res.json(authProviders()); }

async function respond(res, action, status = 200) {
  try { return res.status(status).json(await action()); }
  catch (error) { return res.status(400).json({ erro:error.message }); }
}
