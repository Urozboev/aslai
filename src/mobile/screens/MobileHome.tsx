import { trpc } from "@/providers/trpc";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import MobileLayout from "@/mobile/components/MobileLayout";
import { Store, MessageSquare, AlertTriangle, Activity, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

export default function MobileHome() {
  const navigate = useNavigate();
  const { data: summary } = trpc.market.summary.useQuery();
  const { data: adStats } = trpc.adAnalysis.stats.useQuery();
  const { data: businesses } = trpc.business.list.useQuery();

  const topBusinesses = businesses?.slice(0, 5) || [];

  return (
    <MobileLayout>
      <div className="space-y-5">
        {/* Trust Score Hero */}
        <div className="glass-card flex flex-col items-center py-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/20 mb-3">
            <Activity size={12} className="text-[#0EA5A4]" />
            <span className="text-[10px] font-medium text-[#0EA5A4]">Real-vaqt</span>
          </div>
          <TrustScoreGauge score={summary?.avgTrustScore || 82} size={140} />
          <h2 className="text-lg font-bold mt-3">Umumiy Ishonch</h2>
          <p className="text-xs text-[#8A8F98] mt-0.5">
            {summary?.totalBusinesses || 0} ta biznes asosida
          </p>
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold font-mono-data text-[#0EA5A4]">{summary?.totalReviews || 0}</p>
              <p className="text-[10px] text-[#8A8F98]">Sharhlar</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono-data text-[#F59E0B]">{summary?.totalPrices || 0}</p>
              <p className="text-[10px] text-[#8A8F98]">Narxlar</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/mobile/reviews")}
            className="glass-card p-4 flex flex-col items-start gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0EA5A4]/15 flex items-center justify-center">
              <MessageSquare size={20} className="text-[#0EA5A4]" />
            </div>
            <span className="text-sm font-medium">Sharhlar</span>
            <span className="text-[10px] text-[#8A8F98]">AI tahlili va baholar</span>
          </button>
          <button
            onClick={() => navigate("/mobile/ads")}
            className="glass-card p-4 flex flex-col items-start gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center">
              <AlertTriangle size={20} className="text-[#F59E0B]" />
            </div>
            <span className="text-sm font-medium">Reklama</span>
            <span className="text-[10px] text-[#8A8F98]">Tahlil va tekshiruv</span>
          </button>
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Store, label: "Biznes", value: summary?.totalBusinesses || 0, color: "text-[#0EA5A4]" },
            { icon: MessageSquare, label: "Sharhlar", value: summary?.totalReviews || 0, color: "text-white" },
            { icon: AlertTriangle, label: "Soxta", value: summary?.fakeReviewsCaught || 0, color: "text-red-400" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="glass-card p-3 text-center">
                <Icon size={16} className={`mx-auto mb-1 ${kpi.color}`} />
                <p className="text-lg font-bold font-mono-data">{kpi.value}</p>
                <p className="text-[9px] text-[#8A8F98]">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Ad Stats */}
        {adStats && (
          <div className="glass-card">
            <h3 className="text-sm font-semibold mb-3">Reklama tahlili</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-white/5 text-center">
                <p className="text-base font-bold font-mono-data">{adStats.total}</p>
                <p className="text-[9px] text-[#8A8F98]">Tahlil</p>
              </div>
              <div className="p-2 rounded-lg bg-[#0EA5A4]/5 text-center">
                <p className="text-base font-bold font-mono-data text-[#0EA5A4]">{adStats.avgHonesty}%</p>
                <p className="text-[9px] text-[#8A8F98]">Haqqoniy</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/5 text-center">
                <p className="text-base font-bold font-mono-data text-red-400">{adStats.flaggedCount}</p>
                <p className="text-[9px] text-[#8A8F98]">Shubhali</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Businesses */}
        <div>
          <h3 className="text-sm font-semibold mb-3 px-1">Ishonchli bizneslar</h3>
          <div className="space-y-2">
            {topBusinesses.map((biz) => (
              <button
                key={biz.id}
                onClick={() => navigate(`/mobile/reviews?business=${biz.id}`)}
                className="glass-card w-full flex items-center gap-3 p-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                  <Store size={18} className="text-[#0EA5A4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{biz.name}</p>
                  <p className="text-[10px] text-[#8A8F98]">{biz.category} · {biz.region}</p>
                </div>
                <TrustScoreGauge score={biz.trustScore || 0} size={40} showLabel={false} />
                <ChevronRight size={16} className="text-[#8A8F98]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
