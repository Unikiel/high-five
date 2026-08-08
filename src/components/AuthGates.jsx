import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { AUTHED_HOME, GUEST_HOME, resolvePostAuthPath } from "@/lib/authRedirect";

/**
 * The app's entry point. Signed-in students go to the dashboard, everyone
 * else goes to log in — the marketing page is never the default landing.
 */
export function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? AUTHED_HOME : GUEST_HOME} replace />;
}

/** Keeps signed-in users off the log in and sign up pages. */
export function RequireGuest() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={resolvePostAuthPath(location)} replace />;
  }
  return <Outlet />;
}

/** Sends a signed-out visitor to log in, remembering where they were headed. */
export function RedirectToLogin() {
  const location = useLocation();
  return <Navigate to={GUEST_HOME} state={{ from: location }} replace />;
}
