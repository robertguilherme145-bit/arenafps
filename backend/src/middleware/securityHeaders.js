// Cabecalhos de seguranca para a API e para o frontend servido pelo mesmo Express.
// A CSP permite scripts so do proprio dominio; estilos inline continuam liberados
// porque o React aplica style={} e a fonte vem do Google Fonts.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

export function securityHeaders({ production = process.env.NODE_ENV === "production" } = {}) {
  return (req, res, next) => {
    res.set({
      "Content-Security-Policy":CONTENT_SECURITY_POLICY,
      "X-Frame-Options":"DENY",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"strict-origin-when-cross-origin",
      "Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=()",
      "Cross-Origin-Opener-Policy":"same-origin-allow-popups"
    });
    if (production) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  };
}
