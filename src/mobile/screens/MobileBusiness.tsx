import { useState } from "react";
import { trpc } from "@/providers/trpc";
import MobileLayout from "@/mobile/components/MobileLayout";
import TrustScoreGauge from "@/components/shared/TrustScoreGauge";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import {
  Building2,
  QrCode,
  MessageSquare,
  Copy,
  Check,
  Star,
  Send,
  Sparkles,
  Lightbulb,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export default function MobileBusiness() {
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: businessList } = trpc.business.list.useQuery();
  const { data: bizDetail } = trpc.business.getById.useQuery(
    { id: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null }
  );
  const { data: enrichment } = trpc.business.enrichProfile.useQuery(
    { businessId: selectedBusiness || 0 },
    { enabled: selectedBusiness !== null && showEnrichment }
  );

  const { data: replyDraft } = trpc.review.getReplyDraft.useQuery(
    { reviewId: selectedReview || 0 },
    { enabled: selectedReview !== null }
  );

  const utils = trpc.useUtils();
  const publishReply = trpc.review.publishReply.useMutation({
    onSuccess: () => { toast.success("Saqlandi!"); utils.review.getReplyDraft.invalidate(); },
  });

  const handleCopy = () => {
    if (replyDraft?.finalText) {
      navigator.clipboard.writeText(replyDraft.finalText);
      setCopied(true);
      toast.success("Nusxa olindi!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Business Detail View ───
  if (selectedBusiness && bizDetail) {
    return (
      <MobileLayout title={bizDetail.name} showBack onBack={() => setSelectedBusiness(null)}>
        <div className="space-y-4">
          {/* Profile */}
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <TrustScoreGauge score={bizDetail.trustScore || 0} size={60} />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-base font-bold">{bizDetail.name}</h2>
                  {bizDetail.claimed && <VerifiedBadge />}
                </div>
                <p className="text-xs text-[#8A8F98]">{bizDetail.category} · {bizDetail.region}</p>
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-[#0EA5A4]" />
                <span className="text-sm font-medium">Sharh yig'ish</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                {bizDetail.reviews?.length || 0} ta
              </span>
            </div>
            <div className="w-28 h-28 bg-white rounded-xl p-2 mx-auto">
              <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-0.5">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className={`rounded-[1px] ${Math.random() > 0.4 ? "bg-[#020203]" : "bg-white"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* AI Enrichment */}
          <button onClick={() => setShowEnrichment(!showEnrichment)}
            className="w-full glass-card flex items-center justify-between p-4 gradient-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                <Sparkles size={18} className="text-[#F59E0B]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">AI Profil Boyitish</p>
                <p className="text-[10px] text-[#8A8F98]">Tavsif, kalit so'zlar, FAQ</p>
              </div>
            </div>
            {showEnrichment ? <ChevronUp size={18} className="text-[#8A8F98]" /> : <ChevronDown size={18} className="text-[#8A8F98]" />}
          </button>

          {showEnrichment && enrichment && (
            <div className="space-y-3">
              {/* Description */}
              <div className="glass-card">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={12} className="text-[#F59E0B]" />
                  <span className="text-xs font-medium text-[#F59E0B]">Tavsif</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{enrichment.suggestedDescription}</p>
              </div>

              {/* Keywords */}
              {enrichment.suggestedKeywords.length > 0 && (
                <div className="glass-card">
                  <span className="text-[10px] text-[#8A8F98] mb-2 block">Mijozlar ta'riflari:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {enrichment.suggestedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Complaints */}
              {enrichment.commonComplaints.length > 0 && (
                <div className="glass-card">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={12} className="text-red-400" />
                    <span className="text-[10px] text-red-400">Takomillashtirish:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enrichment.commonComplaints.map((c, i) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px]">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {enrichment.faqSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  {enrichment.faqSuggestions.map((faq, i) => (
                    <div key={i} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                      <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-3 text-left">
                        <span className="text-xs font-medium">{faq.question}</span>
                        {expandedFaq === i ? <ChevronUp size={14} className="text-[#8A8F98] shrink-0" /> : <ChevronDown size={14} className="text-[#8A8F98] shrink-0" />}
                      </button>
                      {expandedFaq === i && (
                        <div className="px-3 pb-3"><p className="text-xs text-[#8A8F98]">{faq.answer}</p></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews with AI Reply */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare size={16} className="text-[#0EA5A4]" />
              Sharhlar
            </h3>
            {bizDetail.reviews?.map((review) => (
              <div key={review.id} className="glass-card p-3.5">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#0EA5A4]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#0EA5A4]">{review.rating}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={10} className={s <= review.rating ? "text-amber-400 fill-amber-400" : "text-[#8A8F98]/30"} />
                      ))}
                      {review.aiFlag && (
                        <span className={`ml-auto text-[8px] px-1.5 py-0.5 rounded-full ${
                          review.aiFlag === "genuine" ? "bg-emerald-500/10 text-emerald-400" :
                          review.aiFlag === "suspicious" ? "bg-amber-500/10 text-amber-400" :
                          "bg-red-500/10 text-red-400"
                        }`}>{review.aiFlag === "genuine" ? "Haqiqiy" : review.aiFlag === "suspicious" ? "Shubhali" : "Soxta"}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/80 mt-1">{review.text}</p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 mt-2">
                  <button onClick={() => setSelectedReview(selectedReview === review.id ? null : review.id)}
                    className="flex items-center gap-1.5 text-xs text-[#0EA5A4]">
                    <Send size={12} />
                    {selectedReview === review.id ? "Yashirish" : "AI javob"}
                  </button>
                  {selectedReview === review.id && replyDraft && (
                    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-[#0EA5A4]/20">
                      <p className="text-[11px] text-[#0EA5A4] mb-1">AI javob:</p>
                      <p className="text-xs text-white/80 leading-relaxed mb-3">{replyDraft.finalText}</p>
                      <div className="flex gap-2">
                        <button onClick={handleCopy}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0EA5A4]/15 text-[#0EA5A4] text-[11px] font-medium">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? "Olindi" : "Nusxa"}
                        </button>
                        <button onClick={() => publishReply.mutate({ replyId: replyDraft.id, finalText: replyDraft.finalText || "" })}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-white text-[11px]">
                          <Check size={12} className="inline mr-1" /> Tasdiqlash
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  // ─── Business List ───
  return (
    <MobileLayout title="Biznes Kopilot">
      <div className="space-y-3">
        <div className="space-y-2">
          {businessList?.map((biz) => (
            <button key={biz.id} onClick={() => setSelectedBusiness(biz.id)}
              className="glass-card w-full flex items-center gap-3 p-3 text-left active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5A4]/20 to-[#0EA5A4]/5 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-[#0EA5A4]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{biz.name}</p>
                <p className="text-[10px] text-[#8A8F98]">{biz.category} · {biz.region}</p>
              </div>
              <TrustScoreGauge score={biz.trustScore || 0} size={40} showLabel={false} />
            </button>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
