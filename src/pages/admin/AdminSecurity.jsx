import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Shield, UserPlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import BackLink from "@/components/BackLink";
import { useAppConfig, useSetAppConfig } from "@/lib/appConfig";
import { toast } from "@/components/ui/use-toast";

export default function AdminSecurity() {
  const { user } = useAuth();
  const { data: config, isLoading, isError } = useAppConfig();
  const setConfig = useSetAppConfig();

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const requireInvitation = Boolean(config?.require_invitation);

  const handleToggle = async (checked) => {
    try {
      await setConfig.mutateAsync(checked);
      toast({
        title: checked ? "Invite-only signup enabled" : "Open signup enabled",
        description: checked
          ? "Only emails invited from Admin → Roles can register."
          : "Anyone can create an account from the register page.",
      });
    } catch (err) {
      toast({
        title: "Could not update setting",
        description: err.message || "Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <BackLink to="/admin" label="Back to Admin" />
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Security</h1>
        <p className="text-muted-foreground mt-1">
          Admin-only security controls for platform protection
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Require invitation to sign up</p>
              <p className="text-xs text-muted-foreground mt-1">
                When on, only emails invited from Admin → Roles can register. Open self-serve signup
                is closed on Landing, Pricing, Login, and Register.
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <Switch
                checked={requireInvitation}
                disabled={setConfig.isPending || isError}
                onCheckedChange={handleToggle}
              />
            )}
          </div>
          {isError && (
            <p className="text-xs text-destructive mt-2">
              Could not load registration settings. Deploy the getAppConfig function and try again.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Content Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Copy & Paste Protection</p>
              <p className="text-xs text-muted-foreground">
                Copy & paste is disabled to protect course and exam content
              </p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
