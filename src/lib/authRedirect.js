export const AUTHED_HOME = "/dashboard";
export const GUEST_HOME = "/login";
export const MARKETING_HOME = "/welcome";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Where to send someone once they've signed in. Prefers the page they were
 * originally trying to open, which RedirectToLogin stores in router state.
 *
 * Anything that isn't a plain in-app path falls back to the dashboard, so a
 * stale or malformed value can never redirect off-site or back into the
 * auth pages.
 */
export function resolvePostAuthPath(location) {
  const from = location?.state?.from;
  if (!from?.pathname) return AUTHED_HOME;

  const { pathname, search = "", hash = "" } = from;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return AUTHED_HOME;
  if (pathname === "/" || AUTH_ROUTES.includes(pathname)) return AUTHED_HOME;

  return `${pathname}${search}${hash}`;
}
