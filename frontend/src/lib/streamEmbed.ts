// Transforma o link de uma transmissao (Twitch, YouTube ou Kick) no endereco do player oficial.
// Sem dependencias. Mantenha igual a backend/src/utils/streamEmbed.js.
export type StreamEmbed = { platform:"twitch" | "youtube" | "kick"; embedUrl:string };

export function toEmbed(value: string, parent: string): StreamEmbed | null {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(String(value).trim()) ? String(value).trim() : `https://${String(value).trim()}`); }
  catch { return null; }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "twitch.tv") {
    if (parts[0] === "videos" && /^\d+$/.test(parts[1] ?? "")) return { platform:"twitch", embedUrl:`https://player.twitch.tv/?video=${parts[1]}&parent=${parent}&muted=true` };
    if (parts.length === 1 && /^\w{3,25}$/.test(parts[0])) return { platform:"twitch", embedUrl:`https://player.twitch.tv/?channel=${parts[0].toLowerCase()}&parent=${parent}&muted=true` };
    return null;
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id = host === "youtu.be" ? parts[0] : url.searchParams.get("v") ?? (["live", "embed", "shorts"].includes(parts[0]) ? parts[1] : null);
    if (id && /^[\w-]{11}$/.test(id)) return { platform:"youtube", embedUrl:`https://www.youtube-nocookie.com/embed/${id}` };
    if (parts[0] === "channel" && /^UC[\w-]{22}$/.test(parts[1] ?? "")) return { platform:"youtube", embedUrl:`https://www.youtube-nocookie.com/embed/live_stream?channel=${parts[1]}` };
    return null;
  }
  if (host === "kick.com" && parts.length === 1 && /^[\w-]{3,25}$/.test(parts[0])) return { platform:"kick", embedUrl:`https://player.kick.com/${parts[0].toLowerCase()}` };
  return null;
}

