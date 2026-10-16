import crypto from "node:crypto";

// Criptografia de segredos guardados no banco (ex.: 2FA) com AES-256-GCM.
// A chave vem de TOTP_ENCRYPTION_KEY ou, sem ela, e derivada do JWT_SECRET.
// Trocar a chave invalida os segredos ja gravados (a pessoa precisa refazer o 2FA).
const PREFIX = "v1.";

function key(environment) {
  const material = environment.TOTP_ENCRYPTION_KEY || environment.JWT_SECRET;
  if (!material) throw new Error("Chave de criptografia ausente.");
  return crypto.createHash("sha256").update(`arena-camp:2fa:${material}`).digest();
}

export function sealSecret(value, environment = process.env) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(environment), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openSecret(value, environment = process.env) {
  const text = String(value ?? "");
  if (!text.startsWith(PREFIX)) return text;
  const [iv, tag, encrypted] = text.slice(PREFIX.length).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(environment), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
