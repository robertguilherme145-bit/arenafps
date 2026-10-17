import { toEmbed } from "../../lib/streamEmbed";
import { cn } from "../../utils/cn";

const PLATFORM_NAMES = { twitch:"Twitch", youtube:"YouTube", kick:"Kick" } as const;

// Player oficial da plataforma dentro do site. A Twitch exige o endereco do site no parametro "parent".
export function StreamPlayer({ url, title, className }: { url: string; title: string; className?: string }) {
  const embed = toEmbed(url, window.location.hostname);
  if (!embed) {
    return <div className={cn("flex aspect-video items-center justify-center border border-arena-line bg-arena-panel2 text-sm text-arena-muted", className)}>Transmissão indisponível.</div>;
  }
  return (
    <div className={cn("border border-arena-line bg-black", className)}>
      <div className="aspect-video">
        <iframe allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen className="h-full w-full" referrerPolicy="strict-origin-when-cross-origin" src={embed.embedUrl} title={`${title} — transmissão na ${PLATFORM_NAMES[embed.platform]}`} />
      </div>
      <a className="block border-t border-arena-line px-3 py-2 text-xs text-arena-muted hover:text-arena-text" href={url} rel="noreferrer" target="_blank">Abrir na {PLATFORM_NAMES[embed.platform]} para ver o chat</a>
    </div>
  );
}
