import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { User, Sun, Moon, Monitor, Shield, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("hf-theme") || "system");

  const applyTheme = (t) => {
    setTheme(t);
    localStorage.setItem("hf-theme", t);
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else if (t === "light") root.classList.remove("dark");
    else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
              {user?.full_name?.[0] || "U"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="text-xs mt-1 capitalize">{user?.role || "student"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "System", icon: Monitor }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => applyTheme(id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                }`}
              >
                <Icon className={`w-5 h-5 ${theme === id ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Content Protection</p>
              <p className="text-xs text-muted-foreground">Copy & paste is disabled to protect content</p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}