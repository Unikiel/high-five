import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
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

const LOGO_URL = "https://media.base44.com/images/public/6a0b3929bdfa692726f9ff18/64f6122bc_generated_image.png";

const studentNav = [
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { path: "/courses", icon: BookOpen, label: "My Courses" },
  { path: "/practice", icon: Target, label: "Practice Exams" },
  { path: "/progress", icon: TrendingUp, label: "My Progress" },
  { path: "/tutoring", icon: Calendar, label: "Tutoring" },
];

const staffNav = [
  { path: "/admin", icon: Home, label: "Overview" },
  { path: "/admin/courses", icon: BookOpen, label: "Courses" },
  { path: "/admin/students", icon: Users, label: "Students" },
  { path: "/admin/reports", icon: TrendingUp, label: "Reports" },
  { path: "/admin/sessions", icon: Calendar, label: "Sessions" },
  { path: "/admin/billing", icon: CreditCard, label: "Billing" },
  { path: "/admin/roles", icon: Shield, label: "Roles & Permissions" },
];

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("hf-theme") || "system");

  const isAdmin = user?.role === "admin";
  const isTutor = user?.role === "tutor" || user?.role === "assistant";
  const isStaff = isAdmin || isTutor;
  // "student" is the default role (replaces the platform's internal "user" label)
  const navItems = isStaff ? staffNav : studentNav;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (t) => {
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else if (t === "light") root.classList.remove("dark");
    else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
    localStorage.setItem("hf-theme", t);
  };

  const handleTheme = (t) => setTheme(t);

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
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <img src={LOGO_URL} alt="High Five" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-tight">High Five</h1>
            <p className="text-sidebar-foreground/60 text-xs">AP Prep Platform</p>
          </div>
          <button className="lg:hidden ml-auto text-sidebar-foreground/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

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
                <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {user?.full_name?.[0] || "U"}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.full_name || "User"}</p>
                  <p className="text-sidebar-foreground/50 text-xs capitalize">{user?.role === "user" ? "student" : (user?.role || "student")}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 mb-1">
              <DropdownMenuItem onClick={() => handleTheme("light")}><Sun className="w-4 h-4 mr-2" />Light Mode {theme === "light" && "✓"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTheme("dark")}><Moon className="w-4 h-4 mr-2" />Dark Mode {theme === "dark" && "✓"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTheme("system")}><Monitor className="w-4 h-4 mr-2" />System {theme === "system" && "✓"}</DropdownMenuItem>
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