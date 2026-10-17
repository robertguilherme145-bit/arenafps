import { Navigate, useLocation } from "react-router-dom";
import { legacyPublicRedirect } from "../lib/legacyRedirects";
import { legacyArenaPath } from "../lib/minhaArena";

// Endereco antigo do site: leva para o novo sem mostrar 404.
export function LegacyRedirect() {
  const location = useLocation();
  return <Navigate replace to={legacyPublicRedirect(location.pathname, location.search) ?? "/"} />;
}

// Paineis antigos (/jogador, /lider, /capitao) viraram secoes da Minha Arena.
export function LegacyPanelRedirect({ panel }: { panel: "jogador" | "lider" | "capitao" }) {
  const location = useLocation();
  return <Navigate replace to={legacyArenaPath(panel, location.search)} />;
}
