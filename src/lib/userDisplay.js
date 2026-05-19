// Helpers for displaying user identity consistently across the app.
// Prefers user-edited display_name, falls back to full_name, then email.

export const getDisplayName = (u) =>
  u?.display_name || u?.full_name || u?.email || "";

export const getInitial = (u) => {
  const name = getDisplayName(u);
  return name?.[0]?.toUpperCase() || "?";
};