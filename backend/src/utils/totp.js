import crypto from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function createTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function createTotpUri(secret, email) {
  const issuer = "Arena Camp";
  const label = `${issuer}:${email}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function verifyTotp(secret, code, now = Date.now()) {
  const normalized = String(code ?? "").replace(/\D/g, "");
  if (normalized.length !== 6) return false;
  const counter = Math.floor(now / 30000);
  return [-1, 0, 1].some((offset) => timingSafeEqual(normalized, generateTotp(secret, counter + offset)));
}

export function generateTotp(secret, counter) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hash = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const value = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  return String(value % 1000000).padStart(6, "0");
}

function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) result += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return result;
}

function base32Decode(value) {
  let bits = "";
  for (const character of value.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Segredo TOTP invalido.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
