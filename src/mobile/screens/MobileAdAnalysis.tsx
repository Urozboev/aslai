import { useState } from "react";
import { trpc } from "@/providers/trpc";
import MobileLayout from "@/mobile/components/MobileLayout";
import AdHonestyMeter from "@/components/shared/AdHonestyMeter";
import { ScanLine, Video, Link as LinkIcon, Image, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type AdSourceType = "instagram_video" | "telegram_post" | "telegram_channel" | "image";

export default function MobileAdAnalysis() {
  const [selectedType, setSelectedType] = useState<AdSourceType | null>(null);
  const [sourceLink, setSourceLink] = useState("");
  const [result, setResult] = useState<any>(null);
  const [expandedFlags, setExpandedFlags] = useState(false);

  const { data: recent } = trpc.adAnalysis.list.useQuery({ limit: 5 });

  const createAnalysis = trpc.adAnalysis.create.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Tahlil tayyor!");
    },
  });

  const handleAnalyze = () => {
    if (!selectedType) { toast.error("Turini tanlang"); return; }
    createAnalysis.mutate({ sourceType: selectedType, sourceLink: sourceLink || undefined });
  };

  const sources: { type: AdSourceType; label: string; icon: typeof Video }[] = [
    { type: "instagram_video", label: "Instagram video", icon: Video },
    { type: "telegram_post", label: "Telegram post", icon: LinkIcon },
    { type: "telegram_channel", label: "Telegram kanal", icon: LinkIcon },
    { type: "image", label: "Reklama rasmi", icon: Image },
  ];

  const flagLabels: Record<string, string> = {
    stock_footage: "Stock video/rasm",
    ai_generated: "AI yaratgan",
    wrong_location: "Noto'g'ri joy",
    misleading_discount: "Chalg'ituvchi chegirma",
    false_claims: "Yolg'on da'vo",
    deepfake: "Deepfake",
    repetitive_promo: "Takroriy reklama",
  };

  return (
    <MobileLayout title="Reklama Tahlili">
      <div className="space-y-4">
        {/* Source Selector */}
        <div className="grid grid-cols-2 gap-2">
          {sources.map((s) => {
            const Icon = s.icon;
            const active = selectedType === s.type;
            return (
              <button key={s.type} onClick={() => { setSelectedType(s.type); setResult(null); }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  active ? "border-[#0EA5A4]/50 bg-[#0EA5A4]/10" : "border-white/10 bg-white/5"
                }`}>
                <Icon size={20} className={active ? "text-[#0EA5A4]" : "text-[#8A8F98]"} />
                <p className="text-xs font-medium mt-1.5">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Input */}
        {selectedType && (
          <div className="space-y-3">
            {selectedType === "instagram_video" || selectedType === "image" ? (
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center">
                <Image size={28} className="mx-auto text-[#8A8F98] mb-2" />
                <p className="text-xs text-[#8A8F98]">Faylni tanlang</p>
              </div>
            ) : (
              <input type="text" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)}
                placeholder="https://t.me/..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50" />
            )}
            <button onClick={handleAnalyze} disabled={createAnalysis.isPending}
              className="w-full py-4 rounded-2xl bg-[#0EA5A4] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              <ScanLine size={18} />
              {createAnalysis.isPending ? "Tahlil..." : "Tekshirish"}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="glass-card gradient-border">
              <AdHonestyMeter score={result.honestyScore} showMismatches mismatches={result.mismatches || []} />

              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/80 leading-relaxed">{result.summary}</p>
              </div>

              {result.flags?.length > 0 && (
                <div className="mt-4">
                  <button onClick={() => setExpandedFlags(!expandedFlags)}
                    className="flex items-center gap-2 text-xs text-[#8A8F98]">
                    <AlertTriangle size={12} />
                    Belgilar ({result.flags.length})
                    {expandedFlags ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedFlags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {result.flags.map((f: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          {flagLabels[f] || f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent */}
        {recent && recent.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">So'ngi</h3>
            <div className="space-y-2">
              {recent.map((a) => (
                <div key={a.id} className="glass-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        (a.honestyScore || 0) >= 70 ? "bg-emerald-500/10" :
                        (a.honestyScore || 0) >= 40 ? "bg-amber-500/10" : "bg-red-500/10"
                      }`}>
                        {(a.honestyScore || 0) >= 70 ? <CheckCircle size={14} className="text-emerald-400" /> :
                         (a.honestyScore || 0) >= 40 ? <AlertTriangle size={14} className="text-amber-400" /> :
                         <XCircle size={14} className="text-red-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium capitalize">{a.sourceType?.replace("_", " ")}</p>
                        <p className="text-[9px] text-[#8A8F98]">{a.createdAt ? new Date(a.createdAt).toLocaleDateString("uz-UZ") : ""}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold font-mono-data ${
                      (a.honestyScore || 0) >= 70 ? "text-emerald-400" :
                      (a.honestyScore || 0) >= 40 ? "text-amber-400" : "text-red-400"
                    }`}>{a.honestyScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
