import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// IPv6: um mesmo cliente controla o /64 inteiro, entao agrupamos pelos 4 primeiros blocos.
export function clientKey(ip) {
  const value = String(ip || "");
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  if (!value.includes(":")) return value;
  const [head, tail = ""] = value.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const groups = [...headGroups, ...Array(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill("0"), ...tailGroups];
  return `${groups.slice(0, 4).map((group) => group.toLowerCase().replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

// Numero de proxies na frente da API. Valor invalido volta para 1 em vez de desligar o proxy.
export function parseTrustProxy(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return 1;
  return Number(text);
}

function limiter({ windowMs, limit, key, skipFailedRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipFailedRequests,
    standardHeaders:"draft-7",
    legacyHeaders:false,
    keyGenerator:key ?? ((req) => clientKey(req.ip)),
    handler:(req, res, next, options) => res.status(options.statusCode).json({
      erro:"Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      code:"RATE_LIMITED"
    })
  });
}

function email(req) {
  return String(req.body?.email || "").trim().toLowerCase();
}

// Login e 2FA: por IP+email, por conta (de qualquer IP) e por IP (listas de senhas).
export const loginLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:10, key:(req) => `${clientKey(req.ip)}:${email(req)}` });
export const loginAccountLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:30, key:(req) => `conta:${email(req)}` });
export const loginIpLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:50 });
// Cadastro: so contam os cadastros aceitos, para erros de digitacao e redes compartilhadas nao bloquearem.
export const registerLimiter = () => limiter({ windowMs:ONE_HOUR, limit:10, skipFailedRequests:true });
// Acoes que disparam email.
export const emailLimiter = () => limiter({ windowMs:ONE_HOUR, limit:5 });
// Tokens de verificacao, recuperacao, troca de codigo OAuth e confirmacao de 2FA.
export const tokenLimiter = () => limiter({ windowMs:FIFTEEN_MINUTES, limit:20 });
