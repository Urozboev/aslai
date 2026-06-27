import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Activity, Loader2, Mail, Lock } from "lucide-react";
import DotGridCanvas from "@/components/effects/DotGridCanvas";

export default function Login() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Hisob yaratildi. Emailingizni tasdiqlang yoki tizimga kiring.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white relative flex items-center justify-center">
      <DotGridCanvas />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <img
              src="/sayyoh_ai_3d_dark_mode_transparent.png"
              alt="Asl AI"
              className="w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(14,165,164,0.35)]"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-glow-teal">Asl AI</h1>
          <p className="text-[#8A8F98] mt-2">Ishonch raqamlarda</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card gradient-border">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/20 mb-4">
              <Activity size={14} className="text-[#0EA5A4]" />
              <span className="text-xs font-medium text-[#0EA5A4]">AI-quvvatli platforma</span>
            </div>
            <h2 className="text-xl font-semibold">
              {mode === "signin" ? "Tizimga kirish" : "Ro'yxatdan o'tish"}
            </h2>
            <p className="text-sm text-[#8A8F98] mt-1">
              O'zbekiston bozorlariga shaffoflik olib keling
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Ismingiz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#8A8F98]/60 focus:outline-none focus:border-[#0EA5A4]/50 transition-colors"
              />
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#8A8F98]/60 focus:outline-none focus:border-[#0EA5A4]/50 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Parol (kamida 6 belgi)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#8A8F98]/60 focus:outline-none focus:border-[#0EA5A4]/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-all shadow-lg shadow-[#0EA5A4]/20 disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {mode === "signin" ? "Kirish" : "Ro'yxatdan o'tish"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setInfo(null);
              }}
              className="text-sm text-[#8A8F98] hover:text-[#0EA5A4] transition-colors"
            >
              {mode === "signin"
                ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting"
                : "Hisobingiz bormi? Tizimga kiring"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#8A8F98]/50 mt-6">
          Asl AI — O'zbekiston bozorlariga ishonch va shaffoflik olib kelish
        </p>
      </div>
    </div>
  );
}
