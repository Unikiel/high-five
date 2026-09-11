import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { acceptInvitation, checkInvitationAllowed, useAppConfig } from "@/lib/appConfig";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * When invite-only mode is on, blocks brand-new Google (or other) accounts
 * that were never invited. Existing users and invited emails pass through.
 */
export default function InviteAccessGuard({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: config, isLoading: configLoading } = useAppConfig();
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isAuthenticated || !user?.email) {
        setBlocked(false);
        return;
      }
      if (configLoading) return;
      if (!config?.require_invitation) {
        setBlocked(false);
        return;
      }

      setChecking(true);
      try {
        const result = await checkInvitationAllowed(user.email);
        if (cancelled) return;
        if (!result.allowed) {
          setBlocked(true);
          return;
        }
        setBlocked(false);
        if (result.reason === "pending_invite") {
          try {
            await acceptInvitation(user.email);
          } catch {
            /* non-fatal */
          }
        }
      } catch {
        if (!cancelled) setBlocked(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.email, config?.require_invitation, configLoading]);

  if (isAuthenticated && (configLoading || checking)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Invitation required</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            High Five is invite-only. <span className="font-medium text-foreground">{user?.email}</span>{" "}
            has not been invited. Ask an admin to invite you from Admin → Roles, then try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => logout(true)}
            >
              Sign out
            </Button>
            <Link to="/login">
              <Button variant="default">Back to log in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
