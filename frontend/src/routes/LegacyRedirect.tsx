import { Navigate, useLocation } from "react-router-dom";
import { legacyPublicRedirect } from "../lib/legacyRedirects";

// Endereco antigo do site: leva para o novo sem mostrar 404.
export function LegacyRedirect() {
  const location = useLocation();
  return <Navigate replace to={legacyPublicRedirect(location.pathname, location.search) ?? "/"} />;
}
