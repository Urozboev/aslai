import { useEffect } from "react";
import { trpc } from "@/providers/trpc";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import KineticText from "@/components/effects/KineticText";
import { TrendingUp, Store, MessageSquare, AlertTriangle, Activity, Smartphone } from "lucide-react";
import { Link } from "react-router";

export default function Home() {
  const { data: summary } = trpc.market.summary.useQuery();
  const { data: adStats } = trpc.adAnalysis.stats.useQuery();
  const { data: businesses } = trpc.business.list.useQuery({ type: "market" });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const topBusinesses = businesses?.slice(0, 5) || [];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[60vh]">
          {/* Left - Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/20">
              <Activity size={14} className="text-[#0EA5A4]" />
              <span className="text-xs font-medium text-[#0EA5A4]">Real-vaqt analitikasi</span>
            </div>

            <KineticText
              text="Ishonch Raqamlarda"
              as="h1"
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-glow-teal"
            />

            <p className="text-lg text-[#8A8F98] leading-relaxed max-w-lg">
              Real-vaqt analitika, shaffof narxlash va tekshirilgan sharhlar
              O'zbekiston bozorlari uchun.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="/market"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0EA5A4] text-white font-medium text-sm hover:bg-[#0D9488] transition-colors shadow-lg shadow-[#0EA5A4]/20"
              >
                <TrendingUp size={16} />
                Bozorni ko'rish
              </a>
              <a
                href="/ads"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-colors"
              >
                <AlertTriangle size={16} />
                Reklamani tekshirish
              </a>
              <Link
                to="/mobile"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-[#0EA5A4]/30 text-[#0EA5A4] font-medium text-sm hover:bg-[#0EA5A4]/10 transition-colors"
              >
                <Smartphone size={16} />
                Mobile versiya
              </Link>
            </div>
          </div>

          {/* Right - Trust Score Card */}
          <div className="glass-card gradient-border flex flex-col items-center justify-center py-12">
            <TrustScoreGauge score={summary?.avgTrustScore || 82} size={180} />
            <div className="mt-6 text-center">
              <h3 className="text-xl font-semibold text-white">Umumiy Ishonch Indeksi</h3>
              <p className="text-sm text-[#8A8F98] mt-1">
                {summary?.totalBusinesses || 0} ta biznes asosida
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-2xl font-bold font-mono-data text-[#0EA5A4]">
                  {summary?.totalReviews || 0}
                </p>
                <p className="text-[10px] text-[#8A8F98] uppercase tracking-wider mt-1">Sharhlar</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-2xl font-bold font-mono-data text-[#F59E0B]">
                  {summary?.totalPrices || 0}
                </p>
                <p className="text-[10px] text-[#8A8F98] uppercase tracking-wider mt-1">Narx yozuvlari</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#0EA5A4]/15 flex items-center justify-center">
                <Store size={20} className="text-[#0EA5A4]" />
              </div>
              <span className="text-sm text-[#8A8F98]">Bizneslar</span>
            </div>
            <p className="text-3xl font-bold font-mono-data text-white">
              {summary?.totalBusinesses || 0}
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center">
                <MessageSquare size={20} className="text-[#F59E0B]" />
              </div>
              <span className="text-sm text-[#8A8F98]">Sharhlar</span>
            </div>
            <p className="text-3xl font-bold font-mono-data text-white">
              {summary?.totalReviews || 0}
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <span className="text-sm text-[#8A8F98]">Soxta sharhlar</span>
            </div>
            <p className="text-3xl font-bold font-mono-data text-red-400">
              {summary?.fakeReviewsCaught || 0}
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Activity size={20} className="text-emerald-400" />
              </div>
              <span className="text-sm text-[#8A8F98]">Bugungi narxlar</span>
            </div>
            <p className="text-3xl font-bold font-mono-data text-emerald-400">
              {summary?.priceEntriesToday || 0}
            </p>
          </div>
        </div>
      </section>

      {/* Top Businesses */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Eng ishonchli bizneslar</h2>
        <div className="grid gap-3">
          {topBusinesses.map((biz) => (
            <a
              key={biz.id}
              href={`/reviews?business=${biz.id}`}
              className="glass-card flex items-center gap-4 p-4 hover:translate-y-[-2px] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                <Store size={20} className="text-[#0EA5A4]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#0EA5A4] transition-colors">
                  {biz.name}
                </h3>
                <p className="text-xs text-[#8A8F98]">
                  {biz.category} {biz.region ? `· ${biz.region}` : ""}
                </p>
              </div>
              <TrustScoreGauge score={biz.trustScore || 0} size={50} showLabel={false} />
            </a>
          ))}
        </div>
      </section>

      {/* Ad Analysis Summary */}
      {adStats && (
        <section>
          <h2 className="text-2xl font-semibold mb-6">Reklama tahlili statistikasi</h2>
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold font-mono-data text-white">{adStats.total}</p>
                <p className="text-xs text-[#8A8F98] mt-1">Tahlillar</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono-data text-[#0EA5A4]">{adStats.avgHonesty}%</p>
                <p className="text-xs text-[#8A8F98] mt-1">O'rtacha haqqoniylik</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono-data text-red-400">{adStats.flaggedCount}</p>
                <p className="text-xs text-[#8A8F98] mt-1">Shubhali</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono-data text-[#F59E0B]">
                  {adStats.byType.instagram_video + adStats.byType.telegram_post + adStats.byType.image}
                </p>
                <p className="text-xs text-[#8A8F98] mt-1">Tekshirilgan</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
