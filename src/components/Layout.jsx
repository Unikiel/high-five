import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { getDisplayName, getInitial } from "@/lib/userDisplay";
import {
  Home, BookOpen, Target, TrendingUp, Calendar, 
  Settings, LogOut, Menu, X, Sun, Moon, Monitor,
  GraduationCap, Users, CreditCard, ChevronDown, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const LOGO_URL = "https://media.base44.com/images/public/6a0b3929bdfa692726f9ff18/74b6eb74e_image.png";

const ALL_NAV_ITEMS = [
  { path: "/dashboard", icon: Home, label: "Dashboard", page: "dashboard" },
  { path: "/courses", icon: BookOpen, label: "My Courses", page: "courses" },
  { path: "/practice", icon: Target, label: "Practice Exams", page: "practice" },
  { path: "/progress", icon: TrendingUp, label: "My Progress", page: "progress" },
  { path: "/tutoring", icon: Calendar, label: "Tutoring", page: "tutoring" },
  { path: "/settings", icon: Settings, label: "Settings", page: "settings" },
  { path: "/admin", icon: Home, label: "Overview", page: "admin" },
  { path: "/admin/courses", icon: BookOpen, label: "Courses", page: "admin_courses" },
  { path: "/admin/students", icon: Users, label: "Students", page: "admin_students" },
  { path: "/admin/reports", icon: TrendingUp, label: "Reports", page: "admin_reports" },
  { path: "/admin/sessions", icon: Calendar, label: "Sessions", page: "admin_sessions" },
  { path: "/admin/billing", icon: CreditCard, label: "Billing", page: "admin_billing" },
  { path: "/admin/roles", icon: Shield, label: "Roles & Permissions", page: "admin_roles" },
];

const DEFAULT_MATRIX = {
  admin:     { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: true, admin_students: true, admin_courses: true, admin_reports: true, admin_sessions: true, admin_billing: true, admin_roles: true },
  tutor:     { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
  assistant: { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
  student:   { dashboard: true, courses: true, practice: true, progress: true, tutoring: true, settings: true, admin: false, admin_students: false, admin_courses: false, admin_reports: false, admin_sessions: false, admin_billing: false, admin_roles: false },
};

export default function Layout() {
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNavItems = () => {
    if (!user) return [];
    const role = user.role === "user" ? "student" : (user.role || "student");
    const matrix = (() => {
      try {
        const saved = localStorage.getItem("hf-role-matrix");
        return saved ? JSON.parse(saved) : DEFAULT_MATRIX;
      } catch {
        return DEFAULT_MATRIX;
      }
    })();
    const permissions = matrix[role] || {};
    return ALL_NAV_ITEMS.filter(item => permissions[item.page] !== false);
  };

  const navItems = getNavItems();

  const handleLogout = () => base44.auth.logout("/");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border hover:opacity-80 transition-opacity">
          <img src={LOGO_URL} alt="High Five" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-tight">High Five</h1>
            <p className="text-sidebar-foreground/60 text-xs">Exam Prep Platform</p>
          </div>
          <button className="lg:hidden ml-auto text-sidebar-foreground/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </Link>

        {/* Slogan */}
        <div className="px-5 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 italic">Stay consistent, stay confident</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path || (path !== "/dashboard" && path !== "/admin" && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-primary text-white shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-all">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitial(user)}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sidebar-foreground text-sm font-medium truncate">{getDisplayName(user) || "User"}</p>
                  <p className="text-sidebar-foreground/50 text-xs capitalize">{user?.role === "user" ? "student" : (user?.role || "student")}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 mb-1">
              <DropdownMenuItem onClick={() => changeTheme("light")}><Sun className="w-4 h-4 mr-2" />Light Mode {theme === "light" && "✓"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme("dark")}><Moon className="w-4 h-4 mr-2" />Dark Mode {theme === "dark" && "✓"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme("system")}><Monitor className="w-4 h-4 mr-2" />System {theme === "system" && "✓"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/settings"><Settings className="w-4 h-4 mr-2" />Settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="High Five" className="w-7 h-7 rounded-lg" />
            <span className="font-display font-bold text-foreground">High Five</span>
          </div>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}