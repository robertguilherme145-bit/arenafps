import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getOAuthLinkUrl } from "../../services/api";
import { Button } from "../ui/Button";

export function DiscordLinkGate() {
  const { profile, token } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const workspace = /^\/(jogador|lider|capitao)(\/|$)/.test(location.pathname);

  if (!token || !profile || !workspace || Boolean(profile.discord_verified)) return null;

  async function connect() {
    setLoading(true);
    try {
      const returnPath = `${location.pathname}${location.search}`;
      window.location.assign(await getOAuthLinkUrl("discord", returnPath));
    } finally {
      setLoading(false);
    }
  }

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg border border-arena-line bg-arena-panel p-6 shadow-panel">
      <MessageCircle className="h-8 w-8 text-cyan-200" />
      <h2 className="mt-4 font-display text-2xl font-semibold">Vincule seu Discord</h2>
      <p className="mt-2 text-sm leading-6 text-arena-muted">O Discord verificado é obrigatório para competir. Assim você recebe os avisos e acessa somente as salas oficiais da sua lineup.</p>
      <Button className="mt-6 w-full" loading={loading} onClick={() => void connect()}>Vincular Discord oficial</Button>
    </div>
  </div>;
}
