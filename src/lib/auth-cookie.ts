// Helpers simples para marcar sesión (usado por middleware + UI)
const COOKIE_NAME = "healzyp-session";

export function setSessionCookie() {
  if (typeof document === "undefined") return;
  const maxAge = 30 * 24 * 60 * 60; // 30 días
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_NAME}=`));
}
