import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import BackLink from "@/components/BackLink";

export default function AdminSecurity() {
  const { user } = useAuth();

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <BackLink to="/admin" label="Back to Admin" />
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Security</h1>
        <p className="text-muted-foreground mt-1">Admin-only security controls for platform protection</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />Content Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Copy & Paste Protection</p>
              <p className="text-xs text-muted-foreground">Copy & paste is disabled to protect course and exam content</p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}