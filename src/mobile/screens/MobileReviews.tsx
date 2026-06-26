import { useState } from "react";
import { trpc } from "@/providers/trpc";
import MobileLayout from "@/mobile/components/MobileLayout";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import RealVsAdRating from "@/components/shared/RealVsAdRating";
import {
  Building2,
  Star,
  Send,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export default function MobileReviews() {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [showForm, setShowForm] = useState(false);

  const { data: businessList } = trpc.business.list.useQuery(
    filterType !== "all" ? { type: filterType as "market" | "tourism" | "service" } : undefined
  );
  const { data: bizDetail } = trpc.business.getById.useQuery(
    { id: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );
  const { data: reviewStats } = trpc.review.getStats.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );

  const utils = trpc.useUtils();
  const createReview = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Sharh qo'shildi!");
      utils.business.getById.invalidate();
      utils.review.getStats.invalidate();
      setReviewText("");
      setReviewRating(5);
      setShowForm(false);
    },
  });

  const filterOptions = [
    { value: "all", label: "Barchasi" },
    { value: "market", label: "Bozor" },
    { value: "tourism", label: "Turizm" },
    { value: "service", label: "Xizmat" },
  ];

  const getFlagStyle = (flag: string | null) => {
    switch (flag) {
      case "genuine": return "border-emerald-500/20 bg-emerald-500/5";
      case "suspicious": return "border-amber-500/20 bg-amber-500/5";
      case "fake": return "border-red-500/20 bg-red-500/5 opacity-60";
      default: return "border-white/10 bg-white/5";
    }
  };

  if (selectedBusiness && bizDetail) {
    return (
      <MobileLayout
        title={bizDetail.name}
        showBack
        onBack={() => setSelectedBusiness(null)}
        rightAction={
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded-lg bg-[#0EA5A4]/15 text-[#0EA5A4] text-xs font-medium">
            {showForm ? "Bekor" : "Sharh"}
          </button>
        }
      >
        <div className="space-y-4">
          {/* Business Info */}
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <TrustScoreGauge score={bizDetail.trustScore || 0} size={60} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold">{bizDetail.name}</h2>
                  {bizDetail.claimed && <VerifiedBadge />}
                </div>
                <p className="text-xs text-[#8A8F98]">{bizDetail.category} · {bizDetail.region}</p>
              </div>
            </div>
            {(bizDetail.adRating || bizDetail.realRating) && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <RealVsAdRating
                  adRating={Number(bizDetail.adRating) || 0}
                  realRating={Number(bizDetail.realRating) || 0}
                />
              </div>
            )}
          </div>

          {/* Stats */}
          {reviewStats && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Jami", value: reviewStats.total, color: "text-white" },
                { label: "Haqiqiy", value: reviewStats.genuine, color: "text-emerald-400" },
                { label: "Shubhali", value: reviewStats.suspicious, color: "text-amber-400" },
                { label: "Soxta", value: reviewStats.fake, color: "text-red-400" },
              ].map((s, i) => (
                <div key={i} className="glass-card p-2 text-center">
                  <p className={`text-lg font-bold font-mono-data ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-[#8A8F98]">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Review Form */}
          {showForm && (
            <div className="glass-card space-y-3">
              <h3 className="text-sm font-semibold">Yangi sharh</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)} className="p-1">
                    <Star size={24}
                      className={s <= reviewRating ? "text-amber-400 fill-amber-400" : "text-[#8A8F98]/30"} />
                  </button>
                ))}
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tajribangiz haqida..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50 resize-none" />
              <button onClick={() => selectedBusiness && reviewText.trim() && createReview.mutate({ businessId: selectedBusiness, rating: reviewRating, text: reviewText })}
                disabled={createReview.isPending || !reviewText.trim()}
                className="w-full py-3 rounded-xl bg-[#0EA5A4] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={14} />
                {createReview.isPending ? "Yuborilmoqda..." : "Jo'natish"}
              </button>
            </div>
          )}

          {/* Reviews */}
          <div className="space-y-2">
            {bizDetail.reviews?.map((review) => (
              <div key={review.id} className={`glass-card p-3.5 border ${getFlagStyle(review.aiFlag)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={10}
                        className={s <= review.rating ? "text-amber-400 fill-amber-400" : "text-[#8A8F98]/30"} />
                    ))}
                  </div>
                  {review.isVerified && <VerifiedBadge size="sm" />}
                  {review.aiFlag && (
                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${
                      review.aiFlag === "genuine" ? "bg-emerald-500/10 text-emerald-400" :
                      review.aiFlag === "suspicious" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {review.aiFlag === "genuine" ? "Haqiqiy" : review.aiFlag === "suspicious" ? "Shubhali" : "Soxta"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/90">{review.text}</p>
                {review.aiAuthenticityScore && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${
                        review.aiAuthenticityScore >= 85 ? "bg-emerald-400" :
                        review.aiAuthenticityScore >= 50 ? "bg-amber-400" : "bg-red-400"
                      }`} style={{ width: `${review.aiAuthenticityScore}%` }} />
                    </div>
                    <span className="text-[9px] font-mono-data text-[#8A8F98]">{review.aiAuthenticityScore}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Business List
  return (
    <MobileLayout title="Sharhlar">
      <div className="space-y-3">
        {/* Filter Toggle */}
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-xs text-[#8A8F98]">
          <Filter size={14} />
          {showFilters ? "Filterni yashirish" : "Filter"}
        </button>

        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map((opt) => (
              <button key={opt.value} onClick={() => setFilterType(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterType === opt.value
                    ? "bg-[#0EA5A4]/15 text-[#0EA5A4] border border-[#0EA5A4]/20"
                    : "bg-white/5 text-[#8A8F98] border border-white/10"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {businessList?.map((biz) => (
            <button key={biz.id} onClick={() => setSelectedBusiness(biz.id)}
              className="glass-card w-full flex items-center gap-3 p-3 text-left active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-[#0EA5A4]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{biz.name}</p>
                <p className="text-[10px] text-[#8A8F98]">{biz.region} · {biz.category}</p>
              </div>
              <TrustScoreGauge score={biz.trustScore || 0} size={40} showLabel={false} />
            </button>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
