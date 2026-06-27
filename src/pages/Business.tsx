import { useState } from "react";
import { trpc } from "@/providers/trpc";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import {
  Building2,
  QrCode,
  MessageSquare,
  Copy,
  Check,
  Search,
  Plus,
  Star,
  Send,
  Sparkles,
  Download,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Camera,
  CheckCircle2,
  History,
  MapPin,
  Receipt,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import CameraCapture from "@/components/shared/CameraCapture";
import { PLACE_KINDS, getPlaceKind, type PhotoRequirement } from "@/lib/photoRequirements";

// "Holatni yangilash" uchun umumiy talab (obyekt-match yumshoq, asosiysi holat bali)
const GENERIC_CONDITION_REQ: PhotoRequirement = {
  id: "umumiy",
  label: "Umumiy holat",
  mustContain: ["joyning ko'rinishi"],
  hint: "Joyning hozirgi holatini suratga oling",
};
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function Business() {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState<"market" | "tourism" | "service">("market");
  const [bizRegion, setBizRegion] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [placeKindId, setPlaceKindId] = useState<string | null>(null);
  const [bizPhotos, setBizPhotos] = useState<
    Record<string, { label: string; url: string; conditionScore: number; conditionNote: string }>
  >({});
  const [cameraReq, setCameraReq] = useState<PhotoRequirement | null>(null);
  // Mavjud biznes uchun "Holatni yangilash" kamerasi
  const [historyCamera, setHistoryCamera] = useState<boolean>(false);
  const [mapUrl, setMapUrl] = useState("");
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: businessList } = trpc.business.list.useQuery();
  const { data: selectedBusinessData } = trpc.business.getById.useQuery(
    { id: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );
  const { data: enrichment } = trpc.business.enrichProfile.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null && showEnrichment }
  );
  const { data: sentimentTimeline } = trpc.analytics.reviewSentimentTimeline.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );
  const { data: ratingDistribution } = trpc.analytics.ratingDistribution.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );

  const { data: replyDraft } = trpc.review.getReplyDraft.useQuery(
    { reviewId: selectedReview || 0 },
    { enabled: selectedReview !== null }
  );

  const utils = trpc.useUtils();

  const createBusiness = trpc.business.create.useMutation({
    onSuccess: () => {
      toast.success("Biznes qo'shildi!");
      utils.business.list.invalidate();
      setShowAddBusiness(false);
      setBizName("");
      setPlaceKindId(null);
      setBizPhotos({});
      setBizCategory("");
      setBizRegion("");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Biznesni saqlab bo'lmadi");
    },
  });

  const updateBusiness = trpc.business.update.useMutation({
    onSuccess: () => {
      toast.success("Profil yangilandi!");
      utils.business.getById.invalidate();
      setShowEditProfile(false);
    },
  });

  const publishReply = trpc.review.publishReply.useMutation({
    onSuccess: () => {
      toast.success("Javob saqlandi!");
      utils.review.getReplyDraft.invalidate();
    },
  });

  // ─── Haqiqat tarixi + narxlar ───
  const { data: placeHistory } = trpc.place.history.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );
  const placeAddPhoto = trpc.place.addPhoto.useMutation({
    onSuccess: () => { toast.success("Holat tarixga qo'shildi!"); utils.place.history.invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Saqlab bo'lmadi"),
  });
  const enrichMap = trpc.place.enrichFromMap.useMutation({
    onSuccess: (d: { found: boolean; note: string }) => {
      if (d.found) toast.success("Xaritadan tarixga qo'shildi!");
      else toast.error(d.note || "Joy topilmadi");
      utils.place.history.invalidate();
      setMapUrl("");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Xato"),
  });
  const [nearby, setNearby] = useState<Record<string, unknown> | null>(null);
  const nearbyPrices = trpc.place.nearbyPrices.useMutation({
    onSuccess: (d: Record<string, unknown>) => setNearby(d),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Xato"),
  });
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const receiptCheck = trpc.price.checkReceipt.useMutation({
    onSuccess: (d: Record<string, unknown>) => setReceipt(d),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Xato"),
  });

  const handleReceiptFile = (file: File | undefined) => {
    if (!file || !selectedBusinessData) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      receiptCheck.mutate({
        base64,
        mimeType: file.type,
        businessName: selectedBusinessData.name,
        region: selectedBusinessData.region,
        category: selectedBusinessData.category,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCopyReply = () => {
    if (replyDraft?.finalText) {
      navigator.clipboard.writeText(replyDraft.finalText);
      setCopied(true);
      toast.success("Nusxa olindi!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedKind = getPlaceKind(placeKindId);
  const requiredReqs = selectedKind?.requirements ?? [];
  const allPhotosReady =
    !!selectedKind && requiredReqs.every((r) => bizPhotos[r.id]);

  const handleSelectKind = (kindId: string) => {
    const kind = getPlaceKind(kindId);
    if (!kind) return;
    setPlaceKindId(kindId);
    setBizType(kind.type);
    if (!bizCategory) setBizCategory(kind.label);
    setBizPhotos({});
  };

  const handleAddBusiness = () => {
    if (!bizName.trim()) {
      toast.error("Biznes nomini kiriting");
      return;
    }
    if (!selectedKind) {
      toast.error("Obyekt turini tanlang");
      return;
    }
    if (!allPhotosReady) {
      toast.error("Barcha talab qilingan rasmlarni kamera orqali tasdiqlang");
      return;
    }
    createBusiness.mutate({
      name: bizName,
      type: bizType,
      region: bizRegion || undefined,
      category: bizCategory || undefined,
      photos: requiredReqs.map((r) => bizPhotos[r.id]),
    });
  };

  const handleDownloadQR = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 512);

    // Dark blocks simulating QR
    ctx.fillStyle = "#020203";
    const cellSize = 16;
    for (let x = 32; x < 480; x += cellSize) {
      for (let y = 32; y < 480; y += cellSize) {
        if (Math.random() > 0.45) {
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Position markers
    ctx.fillStyle = "#020203";
    [[48, 48], [432, 48], [48, 432]].forEach(([px, py]) => {
      ctx.fillRect(px, py, 112, 112);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(px + 24, py + 24, 64, 64);
      ctx.fillStyle = "#020203";
      ctx.fillRect(px + 40, py + 40, 32, 32);
    });

    // Label
    ctx.fillStyle = "#8A8F98";
    ctx.font = "16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${selectedBusinessData?.name || "Biznes"} - Sharh qoldirish`,
      256,
      500
    );

    const link = document.createElement("a");
    link.download = `qr-${selectedBusinessData?.name || "business"}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast.success("QR kod yuklandi!");
  };

  const handleSaveProfile = () => {
    if (!selectedBusiness) return;
    updateBusiness.mutate({
      id: selectedBusiness,
      description: editDescription,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Biznes Kopilot</h1>
        <p className="text-[#8A8F98]">
          Reputatsiyangizni boshqaring, AI bilan boyiting, sharhlarga javob bering
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => { setShowAddBusiness(!showAddBusiness); setShowClaimForm(false); }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#0EA5A4] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors"
        >
          <Plus size={16} />
          Yangi biznes
        </button>
        <button
          onClick={() => { setShowClaimForm(!showClaimForm); setShowAddBusiness(false); }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <Search size={16} />
          Biznesni topish
        </button>
      </div>

      {/* Add Business Form */}
      {showAddBusiness && (
        <div className="glass-card space-y-4">
          <h3 className="text-lg font-semibold">Yangi biznes qo'shish</h3>
          <div className="grid gap-4">
            <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)}
              placeholder="Biznes nomi"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50" />
            <div>
              <p className="text-xs text-[#8A8F98] mb-2 uppercase tracking-wider">Obyekt turi</p>
              <div className="grid grid-cols-2 gap-3">
                {PLACE_KINDS.map((kind) => (
                  <button key={kind.id} onClick={() => handleSelectKind(kind.id)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium border text-left transition-all ${
                      placeKindId === kind.id ? "border-[#0EA5A4]/50 bg-[#0EA5A4]/10 text-[#0EA5A4]" : "border-white/10 bg-white/5 text-[#8A8F98] hover:bg-white/10"
                    }`}>
                    {kind.label}
                  </button>
                ))}
              </div>
            </div>
            <input type="text" value={bizCategory} onChange={(e) => setBizCategory(e.target.value)}
              placeholder="Kategoriya (ixtiyoriy)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50" />
            <input type="text" value={bizRegion} onChange={(e) => setBizRegion(e.target.value)}
              placeholder="Hudud (ixtiyoriy)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50" />

            {/* Talab qilinadigan rasmlar (kamera + AI tekshiruv) */}
            {selectedKind && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#8A8F98] uppercase tracking-wider">
                    Talab qilinadigan rasmlar (real vaqt kamera)
                  </p>
                  <span className="text-[11px] text-[#8A8F98]">
                    {Object.keys(bizPhotos).length}/{requiredReqs.length}
                  </span>
                </div>
                {requiredReqs.map((req) => {
                  const done = bizPhotos[req.id];
                  return (
                    <div key={req.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        done ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/5"
                      }`}>
                      {done ? (
                        <img src={done.url} alt={req.label} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Camera size={18} className="text-[#8A8F98]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white flex items-center gap-1.5">
                          {req.label}
                          {done && <CheckCircle2 size={14} className="text-emerald-400" />}
                        </p>
                        <p className="text-[11px] text-[#8A8F98] truncate">
                          Kerak: {req.mustContain.join(", ")}
                        </p>
                      </div>
                      <button onClick={() => setCameraReq(req)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                          done ? "bg-white/5 text-[#8A8F98] hover:bg-white/10" : "bg-[#0EA5A4] text-white hover:bg-[#0D9488]"
                        }`}>
                        {done ? "Qayta" : "Kamera"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={handleAddBusiness} disabled={createBusiness.isPending || !allPhotosReady}
              className="px-6 py-3 rounded-xl bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50">
              {createBusiness.isPending
                ? "Saqlanmoqda..."
                : !selectedKind
                ? "Obyekt turini tanlang"
                : !allPhotosReady
                ? "Avval rasmlarni tasdiqlang"
                : "Saqlash"}
            </button>
          </div>
        </div>
      )}

      {/* Kamera + AI tekshiruv modal (yangi biznes) */}
      {cameraReq && (
        <CameraCapture
          requirement={cameraReq}
          onClose={() => setCameraReq(null)}
          onVerified={(data) => {
            setBizPhotos((prev) => ({
              ...prev,
              [cameraReq.id]: {
                label: cameraReq.label,
                url: data.url,
                conditionScore: data.conditionScore,
                conditionNote: data.conditionNote,
              },
            }));
            setCameraReq(null);
            toast.success(`${cameraReq.label} tasdiqlandi!`);
          }}
        />
      )}

      {/* Holatni yangilash kamerasi (mavjud biznes) */}
      {historyCamera && selectedBusiness && (
        <CameraCapture
          requirement={GENERIC_CONDITION_REQ}
          onClose={() => setHistoryCamera(false)}
          onVerified={(data) => {
            placeAddPhoto.mutate({
              businessId: selectedBusiness,
              label: GENERIC_CONDITION_REQ.label,
              url: data.url,
              conditionScore: data.conditionScore,
              note: data.conditionNote,
            });
            setHistoryCamera(false);
          }}
        />
      )}

      {/* Claim Business Search */}
      {showClaimForm && (
        <div className="glass-card space-y-4">
          <h3 className="text-lg font-semibold">Biznesni topish va egallash</h3>
          <div className="grid gap-3">
            {businessList?.map((biz) => (
              <button key={biz.id} onClick={() => setSelectedBusiness(biz.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                  selectedBusiness === biz.id ? "border-[#0EA5A4]/50 bg-[#0EA5A4]/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}>
                <Building2 size={20} className="text-[#0EA5A4] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{biz.name}</p>
                  <p className="text-xs text-[#8A8F98]">{biz.region} · {biz.category}</p>
                </div>
                {biz.claimed ? <VerifiedBadge /> : (
                  <span className="text-xs px-2 py-1 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4]">Egallash</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── BUSINESS DETAIL ─── */}
      {selectedBusinessData && (
        <div className="space-y-6">
          {/* ─── Profile Header ─── */}
          <div className="glass-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                  <Building2 size={28} className="text-[#0EA5A4]" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{selectedBusinessData.name}</h2>
                    {selectedBusinessData.claimed && <VerifiedBadge />}
                  </div>
                  <p className="text-sm text-[#8A8F98]">
                    {selectedBusinessData.category} · {selectedBusinessData.region}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowEditProfile(!showEditProfile); setEditDescription(selectedBusinessData.description || ""); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#8A8F98] hover:bg-white/10 hover:text-white transition-all">
                <Edit3 size={14} />
                Tahrirlash
              </button>
            </div>

            {showEditProfile ? (
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Biznes tavsifi..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50 resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={updateBusiness.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A4] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50">
                    <Save size={14} />
                    {updateBusiness.isPending ? "..." : "Saqlash"}
                  </button>
                  <button onClick={() => setShowEditProfile(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white text-sm hover:bg-white/10 transition-colors">
                    <X size={14} /> Bekor qilish
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#8A8F98] leading-relaxed">{selectedBusinessData.description || "Tavsif qo'shilmagan"}</p>
            )}

            {/* Tasdiqlangan rasmlar */}
            {Array.isArray(selectedBusinessData.photos) && selectedBusinessData.photos.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-[#8A8F98] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" /> AI tasdiqlagan rasmlar
                </p>
                <div className="flex flex-wrap gap-2">
                  {(selectedBusinessData.photos as { label: string; url: string }[]).map((ph, i) => (
                    <a key={i} href={ph.url} target="_blank" rel="noreferrer" className="group relative">
                      <img src={ph.url} alt={ph.label} className="w-20 h-20 rounded-lg object-cover border border-white/10" />
                      <span className="absolute bottom-0 inset-x-0 text-[9px] text-white bg-black/60 rounded-b-lg px-1 py-0.5 truncate text-center">
                        {ph.label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-6">
              <TrustScoreGauge score={selectedBusinessData.trustScore || 0} size={60} />
              {ratingDistribution && (
                <div className="flex items-center gap-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const item = ratingDistribution.find((r) => r.rating === star);
                    const count = item?.count || 0;
                    const maxCount = Math.max(...ratingDistribution.map((r) => r.count), 1);
                    return (
                      <div key={star} className="flex flex-col items-center gap-1">
                        <div className="w-2 bg-white/10 rounded-full overflow-hidden" style={{ height: 40 }}>
                          <div className="w-full bg-amber-400 rounded-full" style={{ height: `${(count / maxCount) * 40}px`, marginTop: `${40 - (count / maxCount) * 40}px` }} />
                        </div>
                        <span className="text-[8px] text-[#8A8F98]">{star}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Haqiqat tarixi (joy holati vaqt bo'yicha) ─── */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <History size={20} className="text-[#0EA5A4]" />
                <h3 className="text-lg font-semibold">Haqiqat tarixi</h3>
                {placeHistory?.trend && (
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      placeHistory.trend.direction === "improved"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : placeHistory.trend.direction === "declined"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-[#8A8F98]"
                    }`}
                  >
                    {placeHistory.trend.direction === "improved" ? (
                      <ArrowUp size={12} />
                    ) : placeHistory.trend.direction === "declined" ? (
                      <ArrowDown size={12} />
                    ) : (
                      <Minus size={12} />
                    )}
                    {placeHistory.trend.direction === "improved"
                      ? "Yaxshilangan"
                      : placeHistory.trend.direction === "declined"
                      ? "Yomonlashgan"
                      : "O'zgarmagan"}{" "}
                    ({placeHistory.trend.latest}/100)
                  </span>
                )}
              </div>
              <button
                onClick={() => setHistoryCamera(true)}
                disabled={placeAddPhoto.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A4]/15 text-[#0EA5A4] text-sm font-medium hover:bg-[#0EA5A4]/25 transition-colors disabled:opacity-50"
              >
                <Camera size={14} /> Holatni yangilash
              </button>
            </div>

            {/* Xaritadan tekshirish */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="Google yoki Yandex Maps havolasi..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50"
              />
              <button
                onClick={() => selectedBusiness && mapUrl.trim() && enrichMap.mutate({ businessId: selectedBusiness, url: mapUrl.trim() })}
                disabled={enrichMap.isPending || !mapUrl.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <MapPin size={14} /> {enrichMap.isPending ? "Tekshirilmoqda..." : "Xaritadan qo'shish"}
              </button>
            </div>

            {/* Timeline */}
            {placeHistory && placeHistory.entries.length > 0 ? (
              <div className="space-y-2">
                {placeHistory.entries.map((e: Record<string, any>) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                    {e.url ? (
                      <img src={e.url} alt={e.label} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <MapPin size={16} className="text-[#8A8F98]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        {e.label}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#8A8F98] uppercase">{e.source}</span>
                      </p>
                      {e.note && <p className="text-[11px] text-[#8A8F98] line-clamp-2">{e.note}</p>}
                      <p className="text-[10px] text-[#8A8F98]/70">{new Date(e.capturedAt).toLocaleString("uz-UZ")}</p>
                    </div>
                    {typeof e.conditionScore === "number" && (
                      <div className="text-right shrink-0">
                        <p className={`text-base font-bold font-mono-data ${
                          e.conditionScore >= 70 ? "text-emerald-400" : e.conditionScore >= 40 ? "text-amber-400" : "text-red-400"
                        }`}>{e.conditionScore}</p>
                        <p className="text-[9px] text-[#8A8F98]">holat</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8A8F98]">Hozircha tarix yo'q. Rasm yoki xarita orqali qo'shing.</p>
            )}
          </div>

          {/* ─── Narx radari ─── */}
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-4">
              <Receipt size={20} className="text-[#0EA5A4]" />
              <h3 className="text-lg font-semibold">Narx radari</h3>
            </div>

            {/* Atrofdagi narxlar (faqat dam olish/mehmonxona) */}
            {selectedBusinessData.type === "tourism" && (
              <div className="mb-5">
                <button
                  onClick={() =>
                    nearbyPrices.mutate({
                      name: selectedBusinessData.name,
                      region: selectedBusinessData.region,
                      category: selectedBusinessData.category,
                      type: selectedBusinessData.type,
                    })
                  }
                  disabled={nearbyPrices.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0EA5A4] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50"
                >
                  <TrendingUp size={14} /> {nearbyPrices.isPending ? "Hisoblanmoqda..." : "Atrofdagi narxlarni hisoblash"}
                </button>
                {nearby?.found !== undefined && (
                  <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-lg font-semibold text-white">{String(nearby.avgText || "—")}</p>
                    {nearby.verdict ? (
                      <p className="text-xs text-[#0EA5A4] mt-1 capitalize">Baho: {String(nearby.verdict)}</p>
                    ) : null}
                    {nearby.note ? <p className="text-xs text-[#8A8F98] mt-1">{String(nearby.note)}</p> : null}
                  </div>
                )}
              </div>
            )}

            {/* Chek / narx yorlig'i tekshirish */}
            <div>
              <p className="text-xs text-[#8A8F98] uppercase tracking-wider mb-2">Chek yoki narx yorlig'ini tekshirish</p>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors cursor-pointer">
                <Receipt size={14} />
                {receiptCheck.isPending ? "Tahlil qilinmoqda..." : "Chek rasmini yuklash"}
                <input type="file" accept="image/*" className="hidden" onChange={(ev) => handleReceiptFile(ev.target.files?.[0])} />
              </label>
              {receipt && (
                <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  {Array.isArray(receipt.items) && receipt.items.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {(receipt.items as { name: string; price: number }[]).map((it, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-[#8A8F98]">{it.name}</span>
                          <span className="text-white font-mono-data">{Number(it.price).toLocaleString("uz-UZ")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {typeof receipt.total === "number" && receipt.total > 0 && (
                    <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                      <span className="text-white">Jami</span>
                      <span className="text-white font-mono-data">{Number(receipt.total).toLocaleString("uz-UZ")} so'm</span>
                    </div>
                  )}
                  {receipt.verdict ? (
                    <p className="text-xs mt-2 capitalize text-amber-400">Baho: {String(receipt.verdict)}</p>
                  ) : null}
                  {Array.isArray(receipt.hiddenFees) && receipt.hiddenFees.length > 0 && (
                    <p className="text-xs text-red-400 mt-1">Yashirin to'lovlar: {(receipt.hiddenFees as string[]).join(", ")}</p>
                  )}
                  {receipt.note ? <p className="text-xs text-[#8A8F98] mt-1">{String(receipt.note)}</p> : null}
                </div>
              )}
            </div>
          </div>

          {/* ─── QR Code & Review Collection ─── */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <QrCode size={20} className="text-[#0EA5A4]" />
                <h3 className="text-lg font-semibold">Sharhlar yig'ish</h3>
              </div>
              <button onClick={handleDownloadQR}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A4]/15 text-[#0EA5A4] text-sm font-medium hover:bg-[#0EA5A4]/25 transition-colors">
                <Download size={14} />
                QR yuklash
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 bg-white rounded-xl p-2 flex items-center justify-center shrink-0">
                <div className="w-24 h-24 grid grid-cols-6 grid-rows-6 gap-0.5">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className={`rounded-[1px] ${Math.random() > 0.4 ? "bg-[#020203]" : "bg-white"}`} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white">Mijozlar ushbu QR-kodni skanerlab, tezkor sharh qoldirishi mumkin.</p>
                <p className="text-xs text-[#8A8F98]">QR-ni chop eting, restoranga, do'konga yoki sayyohlik joyiga joylashtiring.</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    {selectedBusinessData.reviews?.length || 0} ta sharh
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4]">
                    Ishonch: {selectedBusinessData.trustScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── AI Profile Enrichment ─── */}
          <div className="glass-card gradient-border">
            <button onClick={() => setShowEnrichment(!showEnrichment)}
              className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F59E0B]/20 to-[#F59E0B]/5 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#F59E0B]" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold">AI Profil Boyitish</h3>
                  <p className="text-xs text-[#8A8F98]">Sharhlar asosida tavsif, kategoriya va FAQ takliflari</p>
                </div>
              </div>
              {showEnrichment ? <ChevronUp size={20} className="text-[#8A8F98]" /> : <ChevronDown size={20} className="text-[#8A8F98]" />}
            </button>

            {showEnrichment && enrichment && (
              <div className="mt-6 space-y-5 border-t border-white/10 pt-5">
                {/* Suggested Description */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-[#F59E0B]" />
                    <span className="text-sm font-medium text-[#F59E0B]">Taklif qilingan tavsif</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                    <p className="text-sm text-white/90 leading-relaxed">{enrichment.suggestedDescription}</p>
                    <button onClick={() => { setEditDescription(enrichment.suggestedDescription); setShowEditProfile(true); }}
                      className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] text-xs font-medium hover:bg-[#F59E0B]/25 transition-colors">
                      <Copy size={12} /> Profilga qo'llash
                    </button>
                  </div>
                </div>

                {/* Positive Keywords */}
                {enrichment.suggestedKeywords.length > 0 && (
                  <div>
                    <span className="text-xs text-[#8A8F98] mb-2 block">Mijozlar ta'riflaydigan kalit so'zlar:</span>
                    <div className="flex flex-wrap gap-2">
                      {enrichment.suggestedKeywords.map((kw, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Complaints */}
                {enrichment.commonComplaints.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-red-400" />
                      <span className="text-xs text-red-400">Takomillashtirish kerak:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {enrichment.commonComplaints.map((c, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Categories */}
                <div>
                  <span className="text-xs text-[#8A8F98] mb-2 block">Taklif qilingan kategoriyalar:</span>
                  <div className="flex flex-wrap gap-2">
                    {enrichment.suggestedCategories.map((cat, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4] text-xs font-medium border border-[#0EA5A4]/20">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* FAQ Suggestions */}
                {enrichment.faqSuggestions.length > 0 && (
                  <div>
                    <span className="text-xs text-[#8A8F98] mb-3 block">Taklif qilingan FAQ:</span>
                    <div className="space-y-2">
                      {enrichment.faqSuggestions.map((faq, i) => (
                        <div key={i} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                          <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                            className="w-full flex items-center justify-between p-4 text-left">
                            <span className="text-sm text-white font-medium">{faq.question}</span>
                            {expandedFaq === i ? <ChevronUp size={16} className="text-[#8A8F98]" /> : <ChevronDown size={16} className="text-[#8A8F98]" />}
                          </button>
                          {expandedFaq === i && (
                            <div className="px-4 pb-4">
                              <p className="text-sm text-[#8A8F98] leading-relaxed">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Sentiment Timeline ─── */}
          {sentimentTimeline && sentimentTimeline.length > 0 && (
            <div className="glass-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#0EA5A4]" />
                Sharhlar dinamikasi
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={sentimentTimeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#8A8F98", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <YAxis tick={{ fill: "#8A8F98", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <Tooltip contentStyle={{ background: "rgba(10, 10, 11, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="positive" stackId="1" stroke="#10B981" fill="url(#posGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="negative" stackId="1" stroke="#EF4444" fill="url(#negGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="fake" stackId="1" stroke="#F59E0B" fill="rgba(245,158,11,0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-[#8A8F98]"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Ijobiy</span>
                <span className="flex items-center gap-1.5 text-xs text-[#8A8F98]"><div className="w-2 h-2 rounded-full bg-red-400" /> Salbiy</span>
                <span className="flex items-center gap-1.5 text-xs text-[#8A8F98]"><div className="w-2 h-2 rounded-full bg-amber-400" /> Soxta</span>
              </div>
            </div>
          )}

          {/* ─── Reviews with AI Reply ─── */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#0EA5A4]" />
              Sharhlar va AI javoblar
            </h3>
            <div className="space-y-4">
              {selectedBusinessData.reviews?.map((review) => {
                const isNegative = review.rating <= 2;
                return (
                  <div key={review.id} className={`glass-card p-5 ${isNegative ? "border-l-2 border-l-red-400/50" : ""}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#0EA5A4]">{review.rating}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12} className={s <= review.rating ? "text-amber-400 fill-amber-400" : "text-[#8A8F98]/30"} />
                          ))}
                          {review.isVerified && <VerifiedBadge size="sm" />}
                          {review.aiFlag && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              review.aiFlag === "genuine" ? "bg-emerald-500/10 text-emerald-400" :
                              review.aiFlag === "suspicious" ? "bg-amber-500/10 text-amber-400" :
                              "bg-red-500/10 text-red-400"
                            }`}>
                              {review.aiFlag === "genuine" ? "Haqiqiy" : review.aiFlag === "suspicious" ? "Shubhali" : "Soxta"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/90">{review.text}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <button onClick={() => setSelectedReview(selectedReview === review.id ? null : review.id)}
                        className="flex items-center gap-2 text-sm text-[#0EA5A4] hover:text-[#2DD4BF] transition-colors">
                        <Send size={14} />
                        {selectedReview === review.id ? "Yashirish" : "AI javob ko'rish"}
                      </button>

                      {selectedReview === review.id && replyDraft && (
                        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-[#0EA5A4]/20">
                          <span className="text-[10px] uppercase tracking-wider text-[#0EA5A4]">AI taklif qilgan javob</span>
                          <p className="text-sm text-white/90 leading-relaxed mt-2 mb-4">{replyDraft.finalText}</p>
                          <div className="flex gap-2">
                            <button onClick={handleCopyReply}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A4]/15 text-[#0EA5A4] text-sm font-medium hover:bg-[#0EA5A4]/25 transition-colors">
                              {copied ? <Check size={14} /> : <Copy size={14} />}
                              {copied ? "Nusxa olindi" : "Nusxa olish"}
                            </button>
                            <button onClick={() => publishReply.mutate({ replyId: replyDraft.id, finalText: replyDraft.finalText || "" })}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white text-sm hover:bg-white/10 transition-colors">
                              <Check size={14} /> Tasdiqlash
                            </button>
                          </div>
                          <p className="text-[10px] text-[#8A8F98] mt-3">
                            Bu javob avtomatik joylanmaydi. Nusxa olib, o'zingiz joylashtirasiz.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Business List ─── */}
      {!selectedBusiness && !showClaimForm && !showAddBusiness && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Barcha bizneslar</h2>
          <div className="grid gap-3">
            {businessList?.map((biz) => (
              <button key={biz.id} onClick={() => setSelectedBusiness(biz.id)}
                className="glass-card flex items-center gap-4 p-4 text-left hover:translate-y-[-2px] transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-[#0EA5A4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{biz.name}</h3>
                  <p className="text-xs text-[#8A8F98]">{biz.category} · {biz.region}</p>
                </div>
                <TrustScoreGauge score={biz.trustScore || 0} size={45} showLabel={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
