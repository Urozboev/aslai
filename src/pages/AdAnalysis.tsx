import { useState } from "react";
import { trpc } from "@/providers/trpc";
import AdHonestyMeter from "@/components/shared/AdHonestyMeter";
import KineticText from "@/components/effects/KineticText";
import {
  ScanLine,
  Upload,
  Link as LinkIcon,
  Image,
  Video,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSearch,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

type AdSourceType = "instagram_video" | "telegram_post" | "telegram_channel" | "image";

export default function AdAnalysis() {
  const [selectedType, setSelectedType] = useState<AdSourceType | null>(null);
  const [sourceLink, setSourceLink] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    id: number;
    claims: string[];
    mismatches: { claim: string; reality: string; evidence: string }[];
    flags: string[];
    honestyScore: number;
    summary: string;
  } | null>(null);
  const [expandedFlags, setExpandedFlags] = useState(false);

  const { data: recentAnalyses } = trpc.adAnalysis.list.useQuery({ limit: 5 });

  const createAnalysis = trpc.adAnalysis.create.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success("Reklama tahlil qilindi!");
    },
  });

  const handleAnalyze = () => {
    if (!selectedType) {
      toast.error("Manba turini tanlang");
      return;
    }
    createAnalysis.mutate({
      sourceType: selectedType,
      sourceLink: sourceLink || undefined,
    });
  };

  const sourceOptions: { type: AdSourceType; label: string; description: string; icon: typeof Video }[] = [
    {
      type: "instagram_video",
      label: "Instagram video",
      description: "Reklama videosini yuklang",
      icon: Video,
    },
    {
      type: "telegram_post",
      label: "Telegram post",
      description: "Telegram havolasini joylashtiring",
      icon: LinkIcon,
    },
    {
      type: "telegram_channel",
      label: "Telegram kanal",
      description: "Kanal havolasini joylashtiring",
      icon: LinkIcon,
    },
    {
      type: "image",
      label: "Reklama rasmi",
      description: "Poster yoki rasm yuklang",
      icon: Image,
    },
  ];

  const flagLabels: Record<string, { label: string; severity: "high" | "medium" | "low" }> = {
    stock_footage: { label: "Stock video/rasm ishlatilgan", severity: "medium" },
    ai_generated: { label: "AI yaratgan kontent", severity: "high" },
    wrong_location: { label: "Noto'g'ri joy ko'rsatilgan", severity: "high" },
    misleading_discount: { label: "Chalg'ituvchi chegirma", severity: "medium" },
    false_claims: { label: "Yolg'on da'volar", severity: "high" },
    deepfake: { label: "Deepfake aniqlandi", severity: "high" },
    repetitive_promo: { label: "Takroriy reklama", severity: "low" },
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-[#8A8F98] bg-white/5 border-white/10";
      default:
        return "text-[#8A8F98] bg-white/5 border-white/10";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <KineticText
          text="Reklama Tahlili"
          as="h1"
          className="text-3xl md:text-4xl font-bold mb-2"
        />
        <p className="text-[#8A8F98]">
          Reklamalarni AI yordamida tekshiring — yolg'on da'volarni aniqlang
        </p>
      </div>

      {/* Source Type Selection */}
      <div className="glass-card">
        <h3 className="text-sm font-medium text-[#8A8F98] mb-4 uppercase tracking-wider">
          Manba turini tanlang
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {sourceOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => {
                  setSelectedType(opt.type);
                  setAnalysisResult(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-[#0EA5A4]/50 bg-[#0EA5A4]/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <Icon
                  size={24}
                  className={isSelected ? "text-[#0EA5A4]" : "text-[#8A8F98]"}
                />
                <p className="text-sm font-medium text-white mt-2">{opt.label}</p>
                <p className="text-[11px] text-[#8A8F98] mt-1">{opt.description}</p>
              </button>
            );
          })}
        </div>

        {/* Input */}
        {selectedType && (
          <div className="mt-6 space-y-4">
            {selectedType === "instagram_video" || selectedType === "image" ? (
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#0EA5A4]/30 transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-[#8A8F98] mb-3" />
                <p className="text-sm text-white font-medium">
                  {selectedType === "instagram_video"
                    ? "Instagram videosini yuklang"
                    : "Reklama rasmini yuklang"}
                </p>
                <p className="text-xs text-[#8A8F98] mt-1">
                  MP4, MOV yoki JPG, PNG (max 50MB)
                </p>
              </div>
            ) : (
              <div className="relative">
                <LinkIcon
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8F98]"
                />
                <input
                  type="text"
                  value={sourceLink}
                  onChange={(e) => setSourceLink(e.target.value)}
                  placeholder="https://t.me/..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50 focus:ring-1 focus:ring-[#0EA5A4]/30 transition-all"
                />
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={createAnalysis.isPending}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50"
            >
              <ScanLine size={18} />
              {createAnalysis.isPending ? "Tahlil qilinmoqda..." : "Tekshirish"}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="glass-card gradient-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#0EA5A4]/15 flex items-center justify-center">
                <FileSearch size={24} className="text-[#0EA5A4]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Tahlil natijalari</h3>
                <p className="text-xs text-[#8A8F98]">AI tomonidan ishlangan</p>
              </div>
            </div>

            <AdHonestyMeter
              score={analysisResult.honestyScore}
              showMismatches={true}
              mismatches={analysisResult.mismatches}
            />

            {/* AI Summary */}
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/90 leading-relaxed">
                {analysisResult.summary}
              </p>
            </div>

            {/* Manipulation Flags */}
            {analysisResult.flags.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setExpandedFlags(!expandedFlags)}
                  className="flex items-center gap-2 text-sm font-medium text-[#8A8F98] hover:text-white transition-colors mb-3"
                >
                  <AlertTriangle size={14} />
                  Manipulyatsiya belgilari ({analysisResult.flags.length})
                  {expandedFlags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedFlags && (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.flags.map((flag, i) => {
                      const info = flagLabels[flag] || { label: flag, severity: "low" as const };
                      return (
                        <span
                          key={i}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getSeverityColor(info.severity)}`}
                        >
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Analyses */}
      {recentAnalyses && recentAnalyses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">So'ngi tahlillar</h2>
          <div className="grid gap-3">
            {recentAnalyses.map((analysis) => (
              <div key={analysis.id} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        (analysis.honestyScore || 0) >= 70
                          ? "bg-emerald-500/10"
                          : (analysis.honestyScore || 0) >= 40
                          ? "bg-amber-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {(analysis.honestyScore || 0) >= 70 ? (
                        <CheckCircle size={18} className="text-emerald-400" />
                      ) : (analysis.honestyScore || 0) >= 40 ? (
                        <AlertTriangle size={18} className="text-amber-400" />
                      ) : (
                        <XCircle size={18} className="text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white capitalize">
                        {analysis.sourceType?.replace("_", " ")}
                      </p>
                      <p className="text-[11px] text-[#8A8F98]">
                        {analysis.createdAt
                          ? new Date(analysis.createdAt).toLocaleDateString("uz-UZ")
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold font-mono-data ${
                        (analysis.honestyScore || 0) >= 70
                          ? "text-emerald-400"
                          : (analysis.honestyScore || 0) >= 40
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {analysis.honestyScore}%
                    </p>
                    <p className="text-[10px] text-[#8A8F98]">Haqqoniylik</p>
                  </div>
                </div>
                {analysis.aiSummary && (
                  <p className="text-xs text-[#8A8F98] mt-3 line-clamp-2">
                    {analysis.aiSummary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
