import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { isGeminiConfigured } from "@/lib/gemini";
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
  MapPin,
  Star,
} from "lucide-react";
import { toast } from "sonner";

type AdSourceType = "instagram_video" | "telegram_post" | "telegram_channel" | "image" | "map_location";

type PlaceResult = {
  found: boolean;
  name: string;
  rating: number;
  reviewCount: number;
  summary: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
};

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
  const [fileName, setFileName] = useState<string | null>(null);
  const [placeResult, setPlaceResult] = useState<PlaceResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<{ base64: string; mimeType: string } | null>(null);

  const { data: recentAnalyses } = trpc.adAnalysis.list.useQuery({ limit: 5 });

  const createAnalysis = trpc.adAnalysis.create.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success("Reklama tahlil qilindi!");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Tahlil qilib bo'lmadi");
    },
  });

  const placeSummary = trpc.place.summary.useMutation({
    onSuccess: (data: PlaceResult) => {
      setPlaceResult(data);
      if (data.found) toast.success("Joy tahlil qilindi!");
      else toast.error(data.summary || "Joy topilmadi");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Joyni tahlil qilib bo'lmadi");
    },
  });

  const analyzing = createAnalysis.isPending || placeSummary.isPending;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? ""); // "data:...;base64," qismini olib tashlash
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    // Inline so'rov hajmi cheklovi (~20MB)
    if (file.size > 18 * 1024 * 1024) {
      toast.error("Fayl juda katta (max ~18MB). Kichikroq rasm/video tanlang.");
      return;
    }
    const base64 = await fileToBase64(file);
    mediaRef.current = { base64, mimeType: file.type };
    setFileName(file.name);
    setAnalysisResult(null);
  };

  const handleAnalyze = () => {
    if (!selectedType) {
      toast.error("Manba turini tanlang");
      return;
    }
    // Google/Yandex Maps havolasi — joy va sharhlar bo'yicha xulosa
    if (selectedType === "map_location") {
      if (!sourceLink.trim()) {
        toast.error("Manzil havolasini kiriting (Google yoki Yandex Maps)");
        return;
      }
      setPlaceResult(null);
      placeSummary.mutate({ url: sourceLink.trim() });
      return;
    }
    const isMediaType = selectedType === "instagram_video" || selectedType === "image";
    if (isMediaType && !mediaRef.current) {
      toast.error("Avval rasm yoki video faylni yuklang");
      return;
    }
    createAnalysis.mutate({
      sourceType: selectedType,
      sourceLink: sourceLink || undefined,
      mediaBase64: mediaRef.current?.base64,
      mediaMimeType: mediaRef.current?.mimeType,
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
    {
      type: "map_location",
      label: "Google/Yandex Map",
      description: "Manzil havolasidan sharhlar xulosasi",
      icon: MapPin,
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
          text="Reklama tahlili"
          as="h1"
          className="text-3xl md:text-4xl font-bold mb-2"
        />
        <p className="text-[#8A8F98]">
          Reklamalarni AI yordamida tekshiring — yolg'on da'volarni aniqlang
        </p>
      </div>

      {!isGeminiConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200/90">
            Gemini AI kaliti sozlanmagan — hozir <b>simulyatsiya</b> rejimida ishlaydi.
            Haqiqiy rasm/video tahlili uchun <code>.env</code> fayliga{" "}
            <code>VITE_GEMINI_API_KEY</code> qo'shing.
          </p>
        </div>
      )}

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
                  setPlaceResult(null);
                  setFileName(null);
                  mediaRef.current = null;
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
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#0EA5A4]/30 transition-colors cursor-pointer"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={selectedType === "image" ? "image/*" : "video/*"}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Upload size={32} className="mx-auto text-[#8A8F98] mb-3" />
                <p className="text-sm text-white font-medium">
                  {fileName
                    ? fileName
                    : selectedType === "instagram_video"
                    ? "Instagram videosini yuklang"
                    : "Reklama rasmini yuklang"}
                </p>
                <p className="text-xs text-[#8A8F98] mt-1">
                  {fileName ? "Boshqa fayl tanlash uchun bosing" : "MP4, MOV yoki JPG, PNG (max ~18MB)"}
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
                  placeholder={
                    selectedType === "map_location"
                      ? "https://maps.app.goo.gl/... yoki https://yandex.uz/maps/..."
                      : "https://t.me/..."
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50 focus:ring-1 focus:ring-[#0EA5A4]/30 transition-all"
                />
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50"
            >
              <ScanLine size={18} />
              {analyzing
                ? "Tahlil qilinmoqda..."
                : selectedType === "map_location"
                ? "Joyni tahlil qilish"
                : "Tekshirish"}
            </button>
          </div>
        )}
      </div>

      {/* Place (Map) Result */}
      {placeResult && (
        <div className="glass-card gradient-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#0EA5A4]/15 flex items-center justify-center">
              <MapPin size={24} className="text-[#0EA5A4]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">
                {placeResult.name || "Joy tahlili"}
              </h3>
              {placeResult.found && (
                <div className="flex items-center gap-3 text-xs text-[#8A8F98] mt-0.5">
                  {placeResult.rating > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star size={12} className="fill-amber-400" />
                      {placeResult.rating.toFixed(1)}
                    </span>
                  )}
                  {placeResult.reviewCount > 0 && <span>{placeResult.reviewCount}+ sharh</span>}
                </div>
              )}
            </div>
          </div>

          {placeResult.summary && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
              <p className="text-sm text-white/90 leading-relaxed">{placeResult.summary}</p>
            </div>
          )}

          {placeResult.found && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {placeResult.pros.length > 0 && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                      Afzalliklari
                    </p>
                    <ul className="space-y-1.5">
                      {placeResult.pros.map((p, i) => (
                        <li key={i} className="text-sm text-white/80 flex gap-2">
                          <span className="text-emerald-400">+</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {placeResult.cons.length > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                      Kamchiliklari
                    </p>
                    <ul className="space-y-1.5">
                      {placeResult.cons.map((c, i) => (
                        <li key={i} className="text-sm text-white/80 flex gap-2">
                          <span className="text-red-400">−</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {placeResult.bestFor.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="text-xs text-[#8A8F98]">Kimlar uchun mos:</span>
                  {placeResult.bestFor.map((b, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4] border border-[#0EA5A4]/20"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

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
