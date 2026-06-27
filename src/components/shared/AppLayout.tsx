import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  MessageSquare,
  ScanLine,
  Building2,
  BarChart3,
  Shield,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import DotGridCanvas from "@/components/effects/DotGridCanvas";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Asosiy", icon: BarChart3 },
  { path: "/reviews", label: "Sharhlar", icon: MessageSquare },
  { path: "/ads", label: "Reklama", icon: ScanLine },
  { path: "/business", label: "Biznesim", icon: Building2 },
  { path: "/admin", label: "Admin", icon: Shield },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#020203] text-white relative overflow-x-hidden">
      <DotGridCanvas />

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#020203]/80 backdrop-blur-md sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/sayyoh_ai_3d_dark_mode_transparent.png"
            alt="Asl AI"
            className="w-8 h-8 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">Asl AI</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0A0A0B]/90 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/sayyoh_ai_3d_dark_mode_transparent.png"
              alt="Asl AI"
              className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(14,165,164,0.3)]"
            />
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none">
                Asl AI
              </h1>
              <p className="text-[10px] text-[#8A8F98] mt-0.5">Ishonch raqamlarda</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#0EA5A4]/15 text-[#0EA5A4] border border-[#0EA5A4]/20"
                      : "text-[#8A8F98] hover:bg-white/5 hover:text-white"
                  }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0EA5A4] to-[#0D9488] flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || "Foydalanuvchi"}</p>
                  <p className="text-[10px] text-[#8A8F98]">{user.email || ""}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#8A8F98] hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
              >
                <LogOut size={16} />
                Chiqish
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#0EA5A4] hover:bg-[#0EA5A4]/10 transition-all"
            >
              <User size={18} />
              Kirish
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
