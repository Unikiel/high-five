import { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { User, Sun, Moon, Monitor, Shield, KeyRound, Pencil, Check, Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem("hf-theme") || "system");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Profile edit state
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.full_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", ok: false });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    await base44.auth.updateMe({ avatar_url: file_url });
    setAvatarUploading(false);
  };

  const saveName = async () => {
    if (!displayName.trim()) return;
    setNameSaving(true);
    await base44.auth.updateMe({ full_name: displayName.trim() });
    setNameMsg("Name updated!");
    setEditingName(false);
    setNameSaving(false);
    setTimeout(() => setNameMsg(""), 3000);
  };

  const changePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ text: "New passwords don't match.", ok: false });
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ text: "Password must be at least 6 characters.", ok: false });
      return;
    }
    setPwSaving(true);
    await base44.auth.updateMe({ password: pwForm.newPw });
    setPwMsg({ text: "Password updated successfully!", ok: true });
    setPwForm({ current: "", newPw: "", confirm: "" });
    setPwSaving(false);
    setTimeout(() => setPwMsg({ text: "", ok: false }), 4000);
  };

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
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                  {displayName?.[0] || user?.full_name?.[0] || "U"}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="text-xs mt-1 capitalize">{user?.role === "user" ? "student" : (user?.role || "student")}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Click avatar to change photo</p>
            </div>
          </div>

          {/* Display name edit */}
          <div className="space-y-2">
            <Label>Display Name</Label>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1"
                />
                <Button size="sm" onClick={saveName} disabled={nameSaving}>
                  {nameSaving ? "Saving…" : <><Check className="w-4 h-4 mr-1" />Save</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setDisplayName(user?.full_name || ""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-foreground">{user?.full_name || "—"}</p>
                <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-primary">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {nameMsg && <p className="text-xs text-green-600">{nameMsg}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          {pwMsg.text && (
            <p className={`text-xs ${pwMsg.ok ? "text-green-600" : "text-red-500"}`}>{pwMsg.text}</p>
          )}
          <Button onClick={changePassword} disabled={pwSaving || !pwForm.newPw || !pwForm.confirm} size="sm">
            {pwSaving ? "Updating…" : "Update Password"}
          </Button>
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