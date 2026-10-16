const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function optionalHttpUrl(value, message = "Informe uma URL valida.") {
  const text = String(value ?? "").trim();
  if (!text) return null;
  let url;
  try { url = new URL(text); } catch { throw new Error(message); }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) throw new Error(message);
  return url.toString();
}
