import { useState } from "react";
import { trpc } from "@/providers/trpc";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import {
  BarChart3,
  Store,
  MessageSquare,
  AlertTriangle,
  Activity,
  TrendingUp,
  Shield,
  Download,
  Filter,
  Map,
  Eye,
  EyeOff,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const HEATMAP_COLORS = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
};

export default function Admin() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "heatmap" | "shadow" | "reports">("overview");

  const { data: adStats } = trpc.adAnalysis.stats.useQuery();
  const { data: businesses } = trpc.business.list.useQuery();
  const { data: marketIndex } = trpc.market.index.useQuery(
    regionFilter !== "all" ? { region: regionFilter } : undefined
  );
  const { data: overview } = trpc.analytics.overview.useQuery();
  const { data: heatmap } = trpc.analytics.fakeReviewHeatmap.useQuery();
  const { data: shadowSignals } = trpc.analytics.shadowEconomySignals.useQuery();

  const regions = [...new Set(businesses?.map((b) => b.region).filter(Boolean) || [])];

  // Chart data
  const trustScoreData = businesses?.slice(0, 8).map((b) => ({
    name: b.name.length > 12 ? b.name.slice(0, 12) + "..." : b.name,
    score: b.trustScore || 0,
  })) || [];

  const reviewDist = [
    { name: "Haqiqiy", value: (overview?.totalReviews || 0) - ((overview?.fakeReviews || 0) + (overview?.suspiciousReviews || 0)) },
    { name: "Shubhali", value: overview?.suspiciousReviews || 0 },
    { name: "Soxta", value: overview?.fakeReviews || 0 },
  ];

  const typeDist = overview?.typeDistribution.map((t) => ({
    name: t.type === "market" ? "Bozor" : t.type === "tourism" ? "Turizm" : "Xizmat",
    value: t.count,
  })) || [];

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ["Nomi", "Tur", "Hudud", "Kategoriya", "Ishonch", "Sharhlar", "Reklama/Real", "Status"],
      ...(businesses || []).map((b) => [
        b.name,
        b.type || "",
        b.region || "",
        b.category || "",
        String(b.trustScore || 0),
        String(b.realRating || ""),
        String(b.adRating || ""),
        b.claimed ? "Tasdiqlangan" : "Tasdiqlanmagan",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sayyoh-bizneslar-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handleExportReport = () => {
    const report = {
      platform: "Sayyoh AI",
      generatedAt: new Date().toISOString(),
      summary: overview,
      adStats,
      topBusinesses: businesses?.slice(0, 5).map((b) => ({
        name: b.name,
        trustScore: b.trustScore,
        region: b.region,
        type: b.type,
      })),
      shadowEconomyFlagged: shadowSignals?.length || 0,
      fakeReviewHotspots: heatmap?.filter((h) => h.riskLevel === "high").length || 0,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sayyoh-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const tabs = [
    { id: "overview" as const, label: "Umumiy", icon: BarChart3 },
    { id: "heatmap" as const, label: "Heatmap", icon: Map },
    { id: "shadow" as const, label: "Soya iqtisodiyot", icon: Eye },
    { id: "reports" as const, label: "Hisobotlar", icon: FileText },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Shield size={28} className="text-[#0EA5A4]" />
            Boshqaruv Paneli
          </h1>
          <p className="text-[#8A8F98]">Platforma analitikasi, monitoring va hisobotlar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors">
            <Download size={14} />
            CSV
          </button>
          <button onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0EA5A4] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors">
            <FileText size={14} />
            Hisobot
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Store size={18} className="text-[#0EA5A4]" />
            <span className="text-xs text-[#8A8F98]">Bizneslar</span>
          </div>
          <p className="text-3xl font-bold font-mono-data text-white">{overview?.totalBusinesses || 0}</p>
          <p className="text-[10px] text-[#8A8F98] mt-1">{overview?.unclaimedBusinesses || 0} tasdiqlanmagan</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-[#8B5CF6]" />
            <span className="text-xs text-[#8A8F98]">Sharhlar</span>
          </div>
          <p className="text-3xl font-bold font-mono-data text-white">{overview?.totalReviews || 0}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-red-400">{overview?.fakeReviews || 0} soxta</span>
            <span className="text-[10px] text-amber-400">{overview?.suspiciousReviews || 0} shubhali</span>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-[#F59E0B]" />
            <span className="text-xs text-[#8A8F98]">Reklama tahlili</span>
          </div>
          <p className="text-3xl font-bold font-mono-data text-white">{overview?.adAnalyses || 0}</p>
          <p className="text-[10px] text-[#8A8F98] mt-1">O'rtacha haqqoniylik: {overview?.avgAdHonesty || 0}%</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-red-400" />
            <span className="text-xs text-[#8A8F98]">Soya signallari</span>
          </div>
          <p className="text-3xl font-bold font-mono-data text-red-400">{shadowSignals?.length || 0}</p>
          <p className="text-[10px] text-[#8A8F98] mt-1">Anomaliya aniqlandi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === tab.id
                  ? "text-[#0EA5A4] border-b-2 border-[#0EA5A4]"
                  : "text-[#8A8F98] hover:text-white"
              }`}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#0EA5A4]" />
                Ishonch ko'rsatkichi (Top 8)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trustScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#8A8F98", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: "#8A8F98", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "rgba(10, 10, 11, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} itemStyle={{ color: "#0EA5A4", fontFamily: "JetBrains Mono" }} />
                  <Bar dataKey="score" fill="#0EA5A4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <MessageSquare size={16} className="text-[#8B5CF6]" />
                Sharhlar taqsimoti
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={reviewDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {reviewDist.map((_, i) => <Cell key={i} fill={i === 0 ? "#10B981" : i === 1 ? "#F59E0B" : "#EF4444"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(10, 10, 11, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-1">
                {reviewDist.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? "#10B981" : i === 1 ? "#F59E0B" : "#EF4444" }} />
                    <span className="text-[11px] text-[#8A8F98]">{e.name}: {e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Type Distribution */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Store size={16} className="text-[#0EA5A4]" />
                Biznes turlari taqsimoti
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={typeDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: "#8A8F98", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#8A8F98", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} width={60} />
                  <Tooltip contentStyle={{ background: "rgba(10, 10, 11, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="#0EA5A4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#F59E0B]" />
                Reklama tahlili
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <p className="text-2xl font-bold font-mono-data text-white">{adStats?.total || 0}</p>
                  <p className="text-xs text-[#8A8F98] mt-1">Tahlillar</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0EA5A4]/5 text-center">
                  <p className="text-2xl font-bold font-mono-data text-[#0EA5A4]">{adStats?.avgHonesty || 0}%</p>
                  <p className="text-xs text-[#8A8F98] mt-1">Haqqoniylik</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 text-center">
                  <p className="text-2xl font-bold font-mono-data text-red-400">{adStats?.flaggedCount || 0}</p>
                  <p className="text-xs text-[#8A8F98] mt-1">Shubhali</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <p className="text-2xl font-bold font-mono-data text-[#F59E0B]">
                    {adStats ? ((adStats.flaggedCount / Math.max(adStats.total, 1)) * 100).toFixed(1) : "0"}%
                  </p>
                  <p className="text-xs text-[#8A8F98] mt-1">Shubhali ulushi</p>
                </div>
              </div>
            </div>
          </div>

          {/* Market Index */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity size={16} className="text-[#0EA5A4]" />
                Bozor indeksi
              </h3>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[#8A8F98]" />
                <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#0EA5A4]/50">
                  <option value="all">Barcha hududlar</option>
                  {regions.map((r) => <option key={r} value={r || ""}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Kategoriya</th>
                    <th className="text-left text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Hudud</th>
                    <th className="text-right text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">O'rtacha narx</th>
                  </tr>
                </thead>
                <tbody>
                  {marketIndex?.map((idx) => (
                    <tr key={idx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 text-sm text-white">{idx.category}</td>
                      <td className="py-3 px-2 text-sm text-[#8A8F98]">{idx.region}</td>
                      <td className="py-3 px-2 text-sm font-mono-data text-[#0EA5A4] text-right">{Number(idx.avgPrice).toLocaleString()} so'm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Business Monitoring */}
          <div className="glass-card">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Store size={16} className="text-[#0EA5A4]" />
              Bizneslar monitoringi
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Nomi</th>
                    <th className="text-left text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Tur</th>
                    <th className="text-center text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Ishonch</th>
                    <th className="text-center text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Reklama / Real</th>
                    <th className="text-center text-xs text-[#8A8F98] font-medium py-3 px-2 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses?.map((biz) => {
                    const adR = Number(biz.adRating) || 0;
                    const realR = Number(biz.realRating) || 0;
                    const hasGap = adR > 0 && realR > 0 && adR - realR > 0.8;
                    return (
                      <tr key={biz.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 text-sm text-white font-medium">{biz.name}</td>
                        <td className="py-3 px-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8A8F98] uppercase">{biz.type}</span></td>
                        <td className="py-3 px-2 text-center"><TrustScoreGauge score={biz.trustScore || 0} size={35} showLabel={false} /></td>
                        <td className="py-3 px-2 text-center">
                          {adR > 0 ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs font-mono-data text-amber-400">{adR.toFixed(1)}</span>
                              <span className="text-[#8A8F98]">/</span>
                              <span className="text-xs font-mono-data text-[#0EA5A4]">{realR.toFixed(1)}</span>
                              {hasGap && <AlertTriangle size={12} className="text-red-400" />}
                            </div>
                          ) : <span className="text-xs text-[#8A8F98]">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {biz.claimed ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4]">Tasdiqlangan</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8A8F98]">Tasdiqlanmagan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── HEATMAP TAB ─── */}
      {activeTab === "heatmap" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Map size={20} className="text-red-400" />
                Soxta sharhlar heatmap'i
              </h2>
              <p className="text-sm text-[#8A8F98] mt-1">Hudud va kategoriya bo'yicha soxta sharhlar ulushi</p>
            </div>
            <button onClick={() => setShowHeatmapInfo(!showHeatmapInfo)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              {showHeatmapInfo ? <EyeOff size={16} className="text-[#8A8F98]" /> : <Eye size={16} className="text-[#8A8F98]" />}
            </button>
          </div>

          {showHeatmapInfo && (
            <div className="glass-card border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">Izoh</p>
                  <p className="text-xs text-[#8A8F98] mt-1">
                    Bu heatmap soxta sharhlarning hudud va kategoriya bo'yicha taqsimotini ko'rsatadi.
                    Qizil rang yuqori xavfni, yashil rang past xavfni bildiradi. Bu signal xususiyatidir,
                    to'g'ridan-to'g'ri dalil emas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#8A8F98]">Xavf darajasi:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: HEATMAP_COLORS.low }} />
              <span className="text-xs text-[#8A8F98]">Past (&lt;15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: HEATMAP_COLORS.medium }} />
              <span className="text-xs text-[#8A8F98]">O'rta (15-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: HEATMAP_COLORS.high }} />
              <span className="text-xs text-[#8A8F98]">Yuqori (&gt;30%)</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="grid gap-3">
            {heatmap?.map((cell, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-12 rounded" style={{
                      backgroundColor: HEATMAP_COLORS[cell.riskLevel as keyof typeof HEATMAP_COLORS],
                      opacity: 0.6 + (cell.fakeRate / 100) * 0.4,
                    }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{cell.region}</span>
                        <span className="text-xs text-[#8A8F98]">·</span>
                        <span className="text-sm text-[#8A8F98]">{cell.category}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-[#8A8F98]">Jami: {cell.total}</span>
                        <span className="text-[10px] text-emerald-400">Haqiqiy: {cell.genuine}</span>
                        <span className="text-[10px] text-amber-400">Shubhali: {cell.suspicious}</span>
                        <span className="text-[10px] text-red-400">Soxta: {cell.fake}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold font-mono-data ${
                      cell.riskLevel === "high" ? "text-red-400" : cell.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {cell.fakeRate}%
                    </p>
                    <p className="text-[10px] text-[#8A8F98]">soxta ulushi</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── SHADOW ECONOMY TAB ─── */}
      {activeTab === "shadow" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Eye size={20} className="text-[#F59E0B]" />
              Soya iqtisodiyot signallari
            </h2>
            <p className="text-sm text-[#8A8F98] mt-1">
              E'lon qilingan faoliyat va platformadagi real faoliyat o'rtasidagi tafovutlar.
              <span className="text-amber-400"> Bu signallar, isbot emas.</span>
            </p>
          </div>

          <div className="grid gap-3">
            {shadowSignals?.map((signal) => (
              <div key={signal.businessId} className="glass-card">
                <button onClick={() => setExpandedSignal(expandedSignal === signal.businessId ? null : signal.businessId)}
                  className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      signal.flag === "high" ? "bg-red-500/10" : signal.flag === "medium" ? "bg-amber-500/10" : "bg-[#0EA5A4]/10"
                    }`}>
                      <Zap size={20} className={
                        signal.flag === "high" ? "text-red-400" : signal.flag === "medium" ? "text-amber-400" : "text-[#0EA5A4]"
                      } />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">{signal.businessName}</p>
                      <p className="text-xs text-[#8A8F98]">{signal.region} · {signal.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-bold font-mono-data ${
                        signal.flag === "high" ? "text-red-400" : signal.flag === "medium" ? "text-amber-400" : "text-[#0EA5A4]"
                      }`}>
                        {signal.anomalyScore}
                      </p>
                      <p className="text-[10px] text-[#8A8F98]">anomaly bali</p>
                    </div>
                    {expandedSignal === signal.businessId ? <ChevronUp size={16} className="text-[#8A8F98]" /> : <ChevronDown size={16} className="text-[#8A8F98]" />}
                  </div>
                </button>

                {expandedSignal === signal.businessId && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-white/5 text-center">
                        <p className="text-lg font-bold font-mono-data text-white">{signal.trustScore}%</p>
                        <p className="text-[10px] text-[#8A8F98]">Ishonch</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 text-center">
                        <p className="text-lg font-bold font-mono-data text-white">{signal.reviewCount}</p>
                        <p className="text-[10px] text-[#8A8F98]">Sharhlar</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 text-center">
                        <p className="text-lg font-bold font-mono-data text-white">{signal.priceCount}</p>
                        <p className="text-[10px] text-[#8A8F98]">Narx yozuvlari</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 text-center">
                        <p className="text-lg font-bold font-mono-data text-white">{signal.claimed ? "Ha" : "Yo'q"}</p>
                        <p className="text-[10px] text-[#8A8F98]">Egallangan</p>
                      </div>
                    </div>
                    {signal.reason && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <p className="text-xs text-amber-400 font-medium mb-1">Aniqlangan signal:</p>
                        <p className="text-sm text-[#8A8F98]">{signal.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {(!shadowSignals || shadowSignals.length === 0) && (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Shield size={28} className="text-emerald-400" />
                </div>
                <p className="text-lg font-semibold text-white">Signal topilmadi</p>
                <p className="text-sm text-[#8A8F98] mt-1">Barcha bizneslar normal faoliyatda</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REPORTS TAB ─── */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText size={20} className="text-[#0EA5A4]" />
              Hisobotlar markazi
            </h2>
            <p className="text-sm text-[#8A8F98] mt-1">Platforma ma'lumotlarini eksport qilish</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#0EA5A4]/10 flex items-center justify-center">
                  <Store size={24} className="text-[#0EA5A4]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Bizneslar ro'yxati</h3>
                  <p className="text-xs text-[#8A8F98]">CSV formatida</p>
                </div>
              </div>
              <p className="text-sm text-[#8A8F98] mb-4">
                Barcha bizneslar haqida to'liq ma'lumot: nomi, turi, hududi, ishonch ko'rsatkichi, statusi.
              </p>
              <button onClick={handleExportCSV}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors">
                <Download size={16} />
                CSV yuklash
              </button>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                  <BarChart3 size={24} className="text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Umumiy hisobot</h3>
                  <p className="text-xs text-[#8A8F98]">JSON formatida</p>
                </div>
              </div>
              <p className="text-sm text-[#8A8F98] mb-4">
                Platformaning umumiy statistikasi, soxta sharhlar, reklama tahlili va soya iqtisodiyot signallari.
              </p>
              <button onClick={handleExportReport}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F59E0B] text-white font-medium hover:bg-[#D97706] transition-colors">
                <FileText size={16} />
                Hisobot yuklash
              </button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="glass-card">
            <h3 className="text-sm font-semibold mb-4">Hisobot tarkibi</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Bizneslar", value: overview?.totalBusinesses || 0 },
                { label: "Sharhlar jami", value: overview?.totalReviews || 0 },
                { label: "Haqiqiy sharhlar", value: (overview?.totalReviews || 0) - ((overview?.fakeReviews || 0) + (overview?.suspiciousReviews || 0)) },
                { label: "Soxta sharhlar", value: overview?.fakeReviews || 0 },
                { label: "Shubhali sharhlar", value: overview?.suspiciousReviews || 0 },
                { label: "Reklama tahlillari", value: overview?.adAnalyses || 0 },
                { label: "Soya signallari", value: shadowSignals?.length || 0 },
                { label: "Issiq nuqtalar", value: heatmap?.filter((h) => h.riskLevel === "high").length || 0 },
                { label: "Tasdiqlanmagan bizneslar", value: overview?.unclaimedBusinesses || 0 },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5">
                  <p className="text-lg font-bold font-mono-data text-white">{item.value}</p>
                  <p className="text-[10px] text-[#8A8F98] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
