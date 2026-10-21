// Rascunho e cancelado nao aparecem para o publico; so o admin ve.
const HIDDEN = ["criado", "cancelado"];

export function isHiddenTournament(status) {
  return HIDDEN.includes(String(status ?? ""));
}

export function canSeeHiddenTournaments(user) {
  return Boolean(user?.roles?.includes("admin"));
}

export function visibleTournaments(list, user) {
  return canSeeHiddenTournaments(user) ? list : list.filter((item) => !isHiddenTournament(item.status));
}
