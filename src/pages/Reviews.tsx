import { useState } from "react";
import { trpc } from "@/providers/trpc";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import RealVsAdRating from "@/components/shared/RealVsAdRating";
import {
  MessageSquare,
  Star,
  Filter,
  MapPin,
  Building2,
  Send,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function Reviews() {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  const { data: businessList } = trpc.business.list.useQuery(
    filterType !== "all" ? { type: filterType as "market" | "tourism" | "service" } : undefined
  );

  const { data: selectedBusinessData } = trpc.business.getById.useQuery(
    { id: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );

  const { data: reviewStats } = trpc.review.getStats.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );

  const { data: aiSummary, isFetching: summaryLoading } = trpc.review.summary.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );

  const utils = trpc.useUtils();
  const createReview = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Sharh qo'shildi! AI tahlil qilindi.");
      utils.business.getById.invalidate();
      utils.review.getStats.invalidate();
      setReviewText("");
      setReviewRating(5);
      setShowReviewForm(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Sharhni saqlab bo'lmadi");
    },
  });

  const handleSubmitReview = () => {
    if (!selectedBusiness || !reviewText.trim()) return;
    createReview.mutate({
      businessId: selectedBusiness,
      rating: reviewRating,
      text: reviewText,
    });
  };

  const filterOptions = [
    { value: "all", label: "Barchasi" },
    { value: "tourism", label: "Turizm" },
    { value: "service", label: "Xizmat" },
  ];

  const getFlagIcon = (flag: string | null) => {
    switch (flag) {
      case "genuine":
        return <ShieldCheck size={14} className="text-emerald-400" />;
      case "suspicious":
        return <AlertTriangle size={14} className="text-amber-400" />;
      case "fake":
        return <XCircle size={14} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getFlagClass = (flag: string | null) => {
    switch (flag) {
      case "genuine":
        return "border-emerald-500/20 bg-emerald-500/5";
      case "suspicious":
        return "border-amber-500/20 bg-amber-500/5";
      case "fake":
        return "border-red-500/20 bg-red-500/5 opacity-60";
      default:
        return "border-white/10 bg-white/5";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Ishonchli sharhlar</h1>
        <p className="text-[#8A8F98]">
          AI yordamida tekshirilgan, haqiqiy sharhlar va baholar
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-[#8A8F98]" />
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setFilterType(opt.value);
              setSelectedBusiness(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filterType === opt.value
                ? "bg-[#0EA5A4]/15 text-[#0EA5A4] border border-[#0EA5A4]/20"
                : "bg-white/5 text-[#8A8F98] border border-white/10 hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Business List or Detail */}
      {!selectedBusiness ? (
        <div className="grid gap-3">
          {businessList?.map((biz) => (
            <button
              key={biz.id}
              onClick={() => setSelectedBusiness(biz.id)}
              className="glass-card text-left p-5 hover:translate-y-[-2px] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-[#0EA5A4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-white group-hover:text-[#0EA5A4] transition-colors">
                      {biz.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8A8F98] uppercase">
                      {biz.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8A8F98] mb-2">
                    <MapPin size={10} />
                    {biz.region || "Noma'lum hudud"} {biz.category ? `· ${biz.category}` : ""}
                  </div>
                  {biz.description && (
                    <p className="text-sm text-[#8A8F98] line-clamp-2">{biz.description}</p>
                  )}
                </div>
                <TrustScoreGauge score={biz.trustScore || 0} size={50} showLabel={false} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Business Detail with Reviews */
        <div className="space-y-6">
          {/* Back + Header */}
          <button
            onClick={() => setSelectedBusiness(null)}
            className="text-sm text-[#0EA5A4] hover:underline"
          >
            ← Orqaga
          </button>

          {selectedBusinessData && (
            <>
              {/* Business Info */}
              <div className="glass-card">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                    <Building2 size={28} className="text-[#0EA5A4]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{selectedBusinessData.name}</h2>
                      {selectedBusinessData.claimed && <VerifiedBadge />}
                    </div>
                    <p className="text-sm text-[#8A8F98] mb-4">{selectedBusinessData.description}</p>

                    <div className="flex flex-wrap items-center gap-6">
                      <TrustScoreGauge score={selectedBusinessData.trustScore || 0} size={60} />
                      {(selectedBusinessData.adRating || selectedBusinessData.realRating) && (
                        <RealVsAdRating
                          adRating={Number(selectedBusinessData.adRating) || 0}
                          realRating={Number(selectedBusinessData.realRating) || 0}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Stats */}
              {reviewStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold font-mono-data text-white">{reviewStats.total}</p>
                    <p className="text-[10px] text-[#8A8F98] uppercase">Jami sharhlar</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold font-mono-data text-emerald-400">{reviewStats.genuine}</p>
                    <p className="text-[10px] text-[#8A8F98] uppercase">Haqiqiy</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold font-mono-data text-amber-400">{reviewStats.suspicious}</p>
                    <p className="text-[10px] text-[#8A8F98] uppercase">Shubhali</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold font-mono-data text-red-400">{reviewStats.fake}</p>
                    <p className="text-[10px] text-[#8A8F98] uppercase">Soxta</p>
                  </div>
                </div>
              )}

              {/* AI Summary (1000 sharhni 10 soniyada jamlash) */}
              <div className="glass-card gradient-border">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#0EA5A4]/15 flex items-center justify-center">
                    <Sparkles size={16} className="text-[#0EA5A4]" />
                  </div>
                  <h3 className="text-base font-semibold">AI Xulosa</h3>
                  {summaryLoading && (
                    <span className="text-xs text-[#8A8F98] animate-pulse">tahlil qilinmoqda…</span>
                  )}
                </div>

                {aiSummary && (
                  <div className="space-y-4">
                    {aiSummary.summary && (
                      <p className="text-sm text-white/90 leading-relaxed">{aiSummary.summary}</p>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {aiSummary.pros.length > 0 && (
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                            Afzalliklari
                          </p>
                          <ul className="space-y-1.5">
                            {aiSummary.pros.map((p: string, i: number) => (
                              <li key={i} className="text-sm text-white/80 flex gap-2">
                                <span className="text-emerald-400">+</span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiSummary.cons.length > 0 && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                            Kamchiliklari
                          </p>
                          <ul className="space-y-1.5">
                            {aiSummary.cons.map((c: string, i: number) => (
                              <li key={i} className="text-sm text-white/80 flex gap-2">
                                <span className="text-red-400">−</span>
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {aiSummary.bestFor.length > 0 && (
                        <>
                          <span className="text-xs text-[#8A8F98]">Kimlar uchun mos:</span>
                          {aiSummary.bestFor.map((b: string, i: number) => (
                            <span
                              key={i}
                              className="text-xs px-3 py-1 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4] border border-[#0EA5A4]/20"
                            >
                              {b}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {aiSummary.priceQuality && (
                      <p className="text-xs text-[#8A8F98]">
                        <b className="text-white/70">Narx–sifat:</b> {aiSummary.priceQuality}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Add Review Button */}
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="w-full glass-card flex items-center justify-center gap-2 py-4 border-dashed border-2 border-[#0EA5A4]/30 hover:border-[#0EA5A4]/50 hover:bg-[#0EA5A4]/5 transition-all"
              >
                <MessageSquare size={18} className="text-[#0EA5A4]" />
                <span className="text-sm font-medium text-[#0EA5A4]">Sharh qoldirish</span>
              </button>

              {/* Review Form */}
              {showReviewForm && (
                <div className="glass-card space-y-4">
                  <h3 className="text-lg font-semibold">Yangi sharh</h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="transition-colors"
                      >
                        <Star
                          size={24}
                          className={
                            star <= reviewRating
                              ? "text-amber-400 fill-amber-400"
                              : "text-[#8A8F98]/30"
                          }
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Tajribangiz haqida yozing..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50 focus:ring-1 focus:ring-[#0EA5A4]/30 transition-all resize-none"
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={createReview.isPending || !reviewText.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50"
                  >
                    <Send size={16} />
                    {createReview.isPending ? "Jo'natilmoqda..." : "Jo'natish"}
                  </button>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Sharhlar</h3>
                {selectedBusinessData.reviews?.map((review) => (
                  <div
                    key={review.id}
                    className={`glass-card p-4 border ${getFlagClass(review.aiFlag)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={
                                star <= review.rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-[#8A8F98]/30"
                              }
                            />
                          ))}
                        </div>
                        {review.isVerified && <VerifiedBadge size="sm" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getFlagIcon(review.aiFlag)}
                        <span
                          className={`text-[10px] font-medium ${
                            review.aiFlag === "genuine"
                              ? "text-emerald-400"
                              : review.aiFlag === "suspicious"
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {review.aiFlag === "genuine"
                            ? "Haqiqiy"
                            : review.aiFlag === "suspicious"
                            ? "Shubhali"
                            : "Soxta"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed">{review.text}</p>
                    {review.aiReason && (
                      <p className="text-[11px] text-[#8A8F98] mt-2">
                        AI tahlili: {review.aiReason}
                      </p>
                    )}
                    {review.aiAuthenticityScore && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              review.aiAuthenticityScore >= 85
                                ? "bg-emerald-400"
                                : review.aiAuthenticityScore >= 50
                                ? "bg-amber-400"
                                : "bg-red-400"
                            }`}
                            style={{ width: `${review.aiAuthenticityScore}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono-data text-[#8A8F98]">
                          {review.aiAuthenticityScore}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
