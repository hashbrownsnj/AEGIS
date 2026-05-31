import {
  Activity,
  Ambulance,
  BarChart3,
  FileClock,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  ShieldCheck
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { endpoints } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, StatusDot } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/",          label: "Command Center", icon: LayoutDashboard, permission: "analytics:read",  group: "main" },
  { to: "/queue",     label: "Live Queue",      icon: Activity,        permission: "queue:read",      group: "main" },
  { to: "/ambulances",label: "Ambulances",      icon: Ambulance,       permission: "ambulances:read", group: "main" },
  { to: "/patients",  label: "Patients",        icon: Users,           permission: "patients:read",   group: "main" },
  { to: "/analytics", label: "Analytics",       icon: BarChart3,       permission: "analytics:read",  group: "reports" },
  { to: "/audit",     label: "Audit Log",       icon: FileClock,       permission: "audit:read",      group: "reports" },
  { to: "/settings",  label: "Settings",        icon: Settings,        permission: "settings:read",   group: "system" },
];

const pageTitles: Record<string, string> = {
  "/":           "Command Center",
  "/queue":      "Live Queue",
  "/ambulances": "Ambulances",
  "/patients":   "Patients",
  "/analytics":  "Analytics",
  "/audit":      "Audit Log",
  "/settings":   "Settings",
};

function pageTitle(pathname: string) {
  if (pathname.startsWith("/patients/")) return "Patient Detail";
  return pageTitles[pathname] ?? "AEGIS";
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="mb-1 mt-4 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-slate-600">
        {label}
      </div>
      {children}
    </div>
  );
}

export function AppShell() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";
  const [aiStatus, setAiStatus] = useState<{ claudeEnabled: boolean; model: string | null } | null>(null);

  useEffect(() => {
    endpoints.aiStatus().then(setAiStatus).catch(() => setAiStatus({ claudeEnabled: false, model: null }));
  }, []);

  const mainItems    = nav.filter((i) => can(i.permission) && i.group === "main");
  const reportItems  = nav.filter((i) => can(i.permission) && i.group === "reports");
  const systemItems  = nav.filter((i) => can(i.permission) && i.group === "system");

  const navItem = (item: typeof nav[0]) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-150",
          isActive
            ? "bg-sky-500/10 text-sky-300 before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r-full before:bg-sky-400"
            : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
        )
      }
    >
      <item.icon className="h-[15px] w-[15px] shrink-0 opacity-80" />
      {item.label}
    </NavLink>
  );

  return (
    <div className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at top left, rgba(14,165,233,.055) 0%, transparent 40%), hsl(var(--background))" }}>

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-slate-800/70 bg-slate-950/95 backdrop-blur-xl lg:flex">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 px-4 py-5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 font-black text-white shadow-lg shadow-sky-900/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-black tracking-tight text-slate-100">AEGIS</div>
            <div className="text-[9px] font-bold uppercase tracking-[.22em] text-slate-500">Command Layer</div>
          </div>
        </Link>

        <div className="mx-4 h-px bg-slate-800/80" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {mainItems.length > 0 && (
            <NavGroup label="Operations">{mainItems.map(navItem)}</NavGroup>
          )}
          {reportItems.length > 0 && (
            <NavGroup label="Reporting">{reportItems.map(navItem)}</NavGroup>
          )}
          {systemItems.length > 0 && (
            <NavGroup label="System">{systemItems.map(navItem)}</NavGroup>
          )}
        </nav>

        {/* Footer status */}
        <div className="border-t border-slate-800/70 px-3 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <StatusDot status={aiStatus?.claudeEnabled ? "live" : "warn"} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-300">
                {aiStatus?.claudeEnabled ? "ACUITY · Claude AI" : "ACUITY · Rules Only"}
              </div>
              <div className="truncate text-[9px] text-slate-600">
                {aiStatus?.claudeEnabled ? aiStatus.model ?? "Claude active" : "Set ANTHROPIC_API_KEY"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────── */}
      <main className="lg:pl-56">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">
                {pageTitle(pathname)}
              </div>
              <div className="text-[11px] text-slate-500">{user?.department || "Emergency Department"}</div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 py-1.5 pl-2 pr-3">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-sky-600/25 text-xs font-black text-sky-400">
                  {initial}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[13px] font-semibold leading-tight text-slate-200">{user?.name}</div>
                  <div className="text-[10px] font-medium text-slate-500 capitalize">{user?.role?.replace(/_/g, " ")}</div>
                </div>
              </div>
              <button
                className="btn btn-secondary grid h-9 w-9 place-items-center p-0"
                aria-label="Sign out"
                onClick={() => logout().then(() => navigate("/login"))}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-5 lg:p-7"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
