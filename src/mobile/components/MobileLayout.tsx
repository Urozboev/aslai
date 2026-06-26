import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  Home,
  Search,
  MessageSquare,
  ScanLine,
  Building2,
  Shield,
  ChevronLeft,
  User,
} from "lucide-react";
import DotGridCanvas from "@/components/effects/DotGridCanvas";

const tabs = [
  { path: "/mobile", label: "Asosiy", icon: Home },
  { path: "/mobile/market", label: "Bozor", icon: Search },
  { path: "/mobile/reviews", label: "Sharhlar", icon: MessageSquare },
  { path: "/mobile/ads", label: "Reklama", icon: ScanLine },
  { path: "/mobile/business", label: "Biznes", icon: Building2 },
];

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export default function MobileLayout({
  children,
  title,
  showBack,
  onBack,
  rightAction,
}: MobileLayoutProps) {
  const location = useLocation();
  const [scrollY, setScrollY] = useState(0);
  // Hide bottom nav when not on main tab routes
  const showNav = tabs.some((t) => t.path === location.pathname);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#020203] text-white relative">
      {/* Background */}
      <DotGridCanvas />

      {/* Top Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrollY > 10
            ? "bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:bg-white/10"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0EA5A4] to-[#0D9488] flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
            )}
            {title && (
              <h1 className="text-base font-semibold truncate">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {rightAction}
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <User size={14} className="text-[#8A8F98]" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-28 pt-2 relative z-10">{children}</main>

      {/* Bottom Tab Bar */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-xl border-t border-white/10 safe-area-pb">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all ${
                    isActive ? "text-[#0EA5A4]" : "text-[#8A8F98]"
                  }`}
                >
                  <div
                    className={`relative p-1.5 rounded-xl transition-all ${
                      isActive ? "bg-[#0EA5A4]/15" : ""
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0EA5A4]" />
                    )}
                  </div>
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
