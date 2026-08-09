const TOKEN_KEY = "arena-camp-token";
const TOKEN_MODE_KEY = "arena-camp-token-mode";
const PERSISTENT_MODE = "persistent";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage) && Boolean(window.sessionStorage);
}

export function getStoredAuthToken() {
  if (!canUseBrowserStorage()) return null;

  const sessionToken = window.sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const persistentToken = window.localStorage.getItem(TOKEN_KEY);
  const persistentMode = window.localStorage.getItem(TOKEN_MODE_KEY) === PERSISTENT_MODE;

  if (persistentToken && persistentMode) return persistentToken;

  if (persistentToken && !persistentMode) {
    window.localStorage.removeItem(TOKEN_KEY);
  }

  return null;
}

export function saveAuthToken(token: string, remember?: boolean) {
  if (!canUseBrowserStorage()) return;

  const shouldRemember =
    remember === true ||
    (remember === undefined && window.localStorage.getItem(TOKEN_MODE_KEY) === PERSISTENT_MODE);

  if (shouldRemember) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(TOKEN_MODE_KEY, PERSISTENT_MODE);
    window.sessionStorage.removeItem(TOKEN_KEY);
    return;
  }

  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_MODE_KEY);
}

export function clearAuthToken() {
  if (!canUseBrowserStorage()) return;

  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_MODE_KEY);
}
