const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function safeHref(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
