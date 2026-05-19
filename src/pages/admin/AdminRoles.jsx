import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Shield, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLES = [
  { id: "admin", label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
  { id: "tutor", label: "Tutor", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400" },
  { id: "assistant", label: "Assistant", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  { id: "user", label: "Student", color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" },
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
  tutor:     { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: true, admin_students: false, admin_courses: true, admin_reports: true, admin_sessions: true, admin_billing: false, admin_roles: false },
  assistant: { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: true, admin_students: false, admin_courses: false, admin_reports: true, admin_sessions: true, admin_billing: false, admin_roles: false },
  user:      { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
};

const STORAGE_KEY = "hf-role-matrix";

function loadMatrix() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_MATRIX;
  } catch {
    return DEFAULT_MATRIX;
  }
}

export default function AdminRoles() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState(loadMatrix);
  const [saved, setSaved] = useState(false);

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
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <Badge key={r.id} className={`${r.color} border-0 text-xs`}>{r.label}</Badge>
        ))}
      </div>

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
    </div>
  );
}