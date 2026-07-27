export function requireVerifiedEmail(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.user?.email_verified) return next();
  return res.status(403).json({ erro: "Confirme seu email para realizar esta acao.", code: "EMAIL_VERIFICATION_REQUIRED" });
}
