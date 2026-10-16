import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function limiter({ windowMs, limit, key }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders:"draft-7",
    legacyHeaders:false,
    keyGenerator:key ?? ((req) => req.ip),
    handler:(req, res, next, options) => res.status(options.statusCode).json({
      erro:"Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      code:"RATE_LIMITED"
    })
  });
}

function emailKey(req) {
  return `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`;
}

// Login e codigo 2FA: limite por email (protege a conta) e por IP (protege contra listas de senhas).
export const loginLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:10, key:emailKey });
export const loginIpLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:50 });
// Acoes que disparam email ou criam contas.
export const emailLimiter = () => limiter({ windowMs:ONE_HOUR, limit:5 });
// Tokens de verificacao, recuperacao, troca de codigo OAuth e confirmacao de 2FA.
export const tokenLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:20 });
