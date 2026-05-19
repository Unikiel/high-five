import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Check, X, Pencil, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { getDisplayName, getInitial } from "@/lib/userDisplay";

const ROLES = [
  { id: "admin", label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
  { id: "tutor", label: "Tutor", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400" },
  { id: "assistant", label: "Assistant", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  { id: "student", label: "Student", color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" },
];

const PAGES = [
  { id: "dashboard",      label: "Dashboard",       path: "/dashboard" },
  { id: "courses",        label: "My Courses",       path: "/courses" },
  { id: "practice",       label: "Practice Exams",   path: "/practice" },
  { id: "progress",       label: "My Progress",      path: "/progress" },
  { id: "tutoring",       label: "Tutoring",         path: "/tutoring" },
  { id: "settings",       label: "Settings",         path: "/settings" },
  { id: "admin",          label: "Admin Overview",   path: "/admin" },
  { id: "admin_students", label: "Admin · Students", path: "/admin/students" },
  { id: "admin_courses",  label: "Admin · Courses",  path: "/admin/courses" },
  { id: "admin_reports",  label: "Admin · Reports",  path: "/admin/reports" },
  { id: "admin_sessions", label: "Admin · Sessions", path: "/admin/sessions" },
  { id: "admin_billing",  label: "Admin · Billing",  path: "/admin/billing" },
  { id: "admin_roles",    label: "Admin · Roles",    path: "/admin/roles" },
];

// Default access matrix — source of truth for what each role can access
const DEFAULT_MATRIX = {
  admin:     { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: true, admin_students: true, admin_courses: true, admin_reports: true, admin_sessions: true, admin_billing: true, admin_roles: true },
  tutor:     { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
  assistant: { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
  student:   { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
};

const STORAGE_KEY = "hf-role-matrix";

function loadMatrix() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_MATRIX;
    const parsed = JSON.parse(saved);
    // Merge with defaults so any missing keys are always populated
    const merged = {};
    for (const role of Object.keys(DEFAULT_MATRIX)) {
      merged[role] = { ...DEFAULT_MATRIX[role], ...(parsed[role] || {}) };
    }
    return merged;
  } catch {
    return DEFAULT_MATRIX;
  }
}

export default function AdminRoles() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState(loadMatrix);
  const [saved, setSaved] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ display_name: "", role: "student" });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // Invite user state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("student");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState({ text: "", ok: false });

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      const email = inviteEmail.trim();

      // inviteUser only accepts "user" or "admin" as base role
      const baseRole = inviteRole === "admin" ? "admin" : "user";
      await base44.users.inviteUser(email, baseRole);

      // Wait a moment for the user to be created in the system
      await new Promise(r => setTimeout(r, 1000));

      // Now reload and update their role
      const updatedUsers = await base44.entities.User.list();
      const existingUser = updatedUsers.find(u => u.email === email);
      if (existingUser) {
        // Always update role to ensure it matches the selection
        await base44.entities.User.update(existingUser.id, { role: inviteRole });
      }

      // Reload final list
      const refreshed = await base44.entities.User.list();
      setAllUsers(refreshed);

      setInviteMsg({ text: `Invite sent to ${email} as ${inviteRole}!`, ok: true });
      setInviteEmail("");
      setInviteRole("student");
      setTimeout(() => { setInviteMsg({ text: "", ok: false }); setShowInvite(false); }, 2500);
    } catch (err) {
      setInviteMsg({ text: `Error: ${err.message}`, ok: false });
    } finally {
      setInviteSending(false);
    }
  };

  const reloadUsers = () => base44.entities.User.list().then(setAllUsers).catch(() => {});

  useEffect(() => {
    base44.entities.User.list()
      .then(u => { setAllUsers(u); setLoadingUsers(false); })
      .catch(() => setLoadingUsers(false));
  }, []);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ display_name: u.display_name || u.full_name || "", role: u.role || "student" });
    setEditMsg("");
  };

  const saveEdit = async () => {
    setEditSaving(true);
    await base44.entities.User.update(editUser.id, { display_name: editForm.display_name, role: editForm.role });
    setEditMsg("Saved!");
    await reloadUsers();
    setEditSaving(false);
    setTimeout(() => { setEditUser(null); setEditMsg(""); }, 1200);
  };

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const toggle = (role, page) => {
    // Prevent removing admin's own access to critical pages
    if (role === "admin" && ["admin", "admin_roles"].includes(page)) return;
    setMatrix(prev => {
      const next = { ...prev, [role]: { ...prev[role], [page]: !prev[role][page] } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetToDefaults = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MATRIX));
    setMatrix(DEFAULT_MATRIX);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Role Permissions</h1>
          <p className="text-muted-foreground mt-1">Page access matrix — control which roles can access each page</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
          <button
            onClick={resetToDefaults}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Reset to defaults
          </button>
          <Button onClick={() => { setShowInvite(true); setInviteMsg({ text: "", ok: false }); }} className="gap-2">
            <UserPlus className="w-4 h-4" /> Invite User
          </Button>
        </div>
      </div>

      {/* Users by Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map(role => {
          const members = allUsers.filter(u => {
            const r = u.role || "student";
            // The platform may store newly registered users as "user" — treat it as "student"
            const normalised = r === "user" ? "student" : r;
            return normalised === role.id;
          });
          return (
            <Card key={role.id} className="border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{role.label}s</CardTitle>
                  <Badge className={`${role.color} border-0 text-xs`}>{members.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {loadingUsers && <p className="text-xs text-muted-foreground">Loading…</p>}
                {!loadingUsers && members.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No users with this role</p>
                )}
                {members.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={getDisplayName(u)} className="w-full h-full object-cover" />
                      ) : (
                        getInitial(u)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{getDisplayName(u) || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <button
                      onClick={() => openEdit(u)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                      title="Edit user"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {members.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{members.length - 5} more</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Page Access Matrix */}
      <h2 className="font-display text-lg font-semibold text-foreground">Page Access Matrix</h2>

      <Card className="border-border/50">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground w-56">Page / Route</th>
                {ROLES.map(r => (
                  <th key={r.id} className="py-4 px-4 font-medium text-center">
                    <Badge className={`${r.color} border-0 text-xs`}>{r.label}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {PAGES.map((page, i) => {
                const isAdminSection = page.id.startsWith("admin");
                return (
                  <tr key={page.id} className={`hover:bg-muted/20 transition-colors ${isAdminSection && i > 5 ? "bg-muted/10" : ""}`}>
                    <td className="py-3 px-6">
                      <p className="font-medium text-foreground">{page.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{page.path}</p>
                    </td>
                    {ROLES.map(role => {
                      const allowed = matrix[role.id]?.[page.id] ?? false;
                      const locked = role.id === "admin" && ["admin", "admin_roles"].includes(page.id);
                      return (
                        <td key={role.id} className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggle(role.id, page.id)}
                            disabled={locked}
                            title={locked ? "Cannot remove admin access" : allowed ? "Click to revoke" : "Click to grant"}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                              locked
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:scale-110 cursor-pointer"
                            } ${
                              allowed
                                ? "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400"
                                : "bg-red-50 text-red-400 dark:bg-red-950/20 dark:text-red-500"
                            }`}
                          >
                            {allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Note: Changes are saved to this browser's local storage and serve as a reference matrix. Actual route enforcement is handled in code per page.
      </p>

      {/* Invite User Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInvite(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Invite User</h2>
              <p className="text-xs text-muted-foreground mt-0.5">They'll receive an email to join the platform. Once they register, find them in the Student card and update their role here.</p>
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                onKeyDown={e => e.key === "Enter" && sendInvite()}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setInviteRole(r.id)}
                    className={`py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      inviteRole === r.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {inviteMsg.text && (
              <p className={`text-xs font-medium ${inviteMsg.ok ? "text-green-600" : "text-red-500"}`}>{inviteMsg.text}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} className="flex-1">
                {inviteSending ? "Sending…" : "Send Invite"}
              </Button>
              <Button variant="ghost" onClick={() => setShowInvite(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditUser(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg overflow-hidden flex-shrink-0">
                {editUser.avatar_url ? (
                  <img src={editUser.avatar_url} alt={getDisplayName(editUser)} className="w-full h-full object-cover" />
                ) : (
                  getInitial(editUser)
                )}
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Edit User</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editUser.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editForm.display_name}
                onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Display name"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setEditForm(f => ({ ...f, role: r.id }))}
                    className={`py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      editForm.role === r.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {editMsg && <p className="text-xs text-green-600 font-medium">{editMsg}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={saveEdit} disabled={editSaving} className="flex-1">
                {editSaving ? "Saving…" : "Save Changes"}
              </Button>
              <Button variant="ghost" onClick={() => setEditUser(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}