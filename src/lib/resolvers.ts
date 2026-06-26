/**
 * Resolvers — eski tRPC/Drizzle router mantig'i endi to'g'ridan-to'g'ri
 * Supabase (PostgREST) ustida ishlaydi. Har bir kalit "router.procedure"
 * yo'liga mos keladi va eski API bilan bir xil shakldagi ma'lumot qaytaradi.
 */
import { supabase } from "./supabase";

// ─── Helperlar ───────────────────────────────────────────────────────────
type Row = Record<string, any>;

async function rows(promise: any): Promise<Row[]> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

async function one(promise: any): Promise<Row | null> {
  const { data, error } = await promise;
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data ?? null) as Row | null;
}

type Input = Record<string, any> | undefined;

export const resolvers: Record<string, (input: Input) => Promise<any>> = {
  // ═══════════════════════════ BUSINESS ═══════════════════════════
  "business.list": async (input) => {
    let q = supabase.from("businesses").select("*");
    if (input?.type) q = q.eq("type", input.type);
    if (input?.region) q = q.eq("region", input.region);
    if (input?.category) q = q.eq("category", input.category);
    if (input?.search) q = q.ilike("name", `%${input.search}%`);
    q = q.order("trustScore", { ascending: false });
    return rows(q);
  },

  "business.getById": async (input) => {
    const id = input!.id;
    const business = await one(
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
    );
    if (!business) return null;
    const reviewsList = await rows(
      supabase.from("reviews").select("*").eq("businessId", id).order("createdAt", { ascending: false }),
    );
    const claims = await rows(
      supabase.from("claim_registry").select("*").eq("businessId", id),
    );
    return { ...business, reviews: reviewsList, claims };
  },

  "business.create": async (input) => {
    const i = input!;
    const inserted = await one(
      supabase.from("businesses").insert({
        name: i.name,
        type: i.type,
        category: i.category || null,
        region: i.region || null,
        description: i.description || null,
        lat: i.lat || null,
        lng: i.lng || null,
      }).select().single(),
    );
    return { id: Number(inserted?.id), ...i };
  },

  "business.claim": async (input) => {
    const i = input!;
    const { error } = await supabase
      .from("businesses")
      .update({ ownerId: i.ownerId, claimed: true })
      .eq("id", i.businessId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  "business.update": async (input) => {
    const i = input!;
    const updates: Row = {};
    for (const k of ["name", "description", "category", "region", "lat", "lng"]) {
      if (i[k] !== undefined) updates[k] = i[k];
    }
    const { error } = await supabase.from("businesses").update(updates).eq("id", i.id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  "business.enrichProfile": async (input) => {
    const id = input!.businessId;
    const business = await one(
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
    );
    if (!business) return null;
    const businessReviews = await rows(
      supabase.from("reviews").select("*").eq("businessId", id),
    );
    const positiveKeywords = extractPositiveKeywords(businessReviews);
    const commonComplaints = extractComplaints(businessReviews);
    const avgRating = businessReviews.length > 0
      ? businessReviews.reduce((s, r) => s + r.rating, 0) / businessReviews.length
      : 0;
    const suggestions = generateSuggestions(business, positiveKeywords, commonComplaints, avgRating);
    return {
      businessId: business.id,
      name: business.name,
      currentDescription: business.description,
      suggestedDescription: suggestions.description,
      suggestedCategories: suggestions.categories,
      suggestedKeywords: positiveKeywords,
      commonComplaints,
      faqSuggestions: suggestions.faqs,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  },

  // ═══════════════════════════ PRODUCT ════════════════════════════
  "product.list": async (input) => {
    let q = supabase.from("products").select("*");
    if (input?.businessId) q = q.eq("businessId", input.businessId);
    if (input?.search) q = q.ilike("name", `%${input.search}%`);
    return rows(q);
  },

  "product.getPrices": async (input) => {
    const days = input?.days ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    return rows(
      supabase.from("price_entries").select("*")
        .eq("productId", input!.productId)
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
    );
  },

  "product.search": async (input) => {
    const query = input!.query as string;
    const products = await rows(
      supabase.from("products").select("*").ilike("name", `%${query}%`),
    );
    if (products.length === 0) return [];
    const businesses = await rows(supabase.from("businesses").select("*"));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));

    const result: Row[] = [];
    for (const product of products) {
      const latest = await one(
        supabase.from("price_entries").select("price")
          .eq("productId", product.id)
          .order("createdAt", { ascending: false })
          .limit(1).maybeSingle(),
      );
      result.push({
        product,
        business: product.businessId ? bizMap.get(product.businessId) ?? null : null,
        latestPrice: latest?.price ?? null,
      });
    }
    return result;
  },

  "product.create": async (input) => {
    const i = input!;
    const inserted = await one(
      supabase.from("products").insert({
        name: i.name,
        category: i.category || null,
        unit: i.unit || null,
        businessId: i.businessId || null,
      }).select().single(),
    );
    return { id: Number(inserted?.id), ...i };
  },

  "product.addPrice": async (input) => {
    const i = input!;
    const inserted = await one(
      supabase.from("price_entries").insert({
        productId: i.productId,
        businessId: i.businessId || null,
        price: i.price,
        unit: i.unit || null,
        source: i.source || "web",
      }).select().single(),
    );
    return { id: Number(inserted?.id), ...i };
  },

  "product.cheapest": async (input) => {
    const entries = await rows(supabase.from("price_entries").select("*"));
    const products = await rows(supabase.from("products").select("*"));
    const businesses = await rows(supabase.from("businesses").select("*"));
    const prodMap = new Map(products.map((p) => [p.id, p]));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));

    // har bir mahsulot bo'yicha eng arzon narx
    const cheapestByProduct = new Map<number, Row>();
    for (const e of entries) {
      const cur = cheapestByProduct.get(e.productId);
      if (!cur || Number(e.price) < Number(cur.price)) cheapestByProduct.set(e.productId, e);
    }

    let result = Array.from(cheapestByProduct.values())
      .sort((a, b) => Number(a.price) - Number(b.price))
      .map((e) => ({
        product: prodMap.get(e.productId) ?? null,
        business: e.businessId ? bizMap.get(e.businessId) ?? null : null,
        price: e.price,
        unit: e.unit,
      }));

    if (input?.productName) {
      const term = String(input.productName).toLowerCase();
      result = result.filter((r) => r.product?.name?.toLowerCase().includes(term));
    }
    return result;
  },

  // ═══════════════════════════ REVIEW ═════════════════════════════
  "review.list": async (input) => {
    let q = supabase.from("reviews").select("*").eq("businessId", input!.businessId);
    if (input?.status) q = q.eq("status", input.status);
    return rows(q.order("createdAt", { ascending: false }));
  },

  "review.create": async (input) => {
    const i = input!;
    const aiScore = simulateAIAnalysis(i.text || "");
    const inserted = await one(
      supabase.from("reviews").insert({
        businessId: i.businessId,
        authorId: i.authorId || null,
        rating: i.rating,
        text: i.text || null,
        imageUrl: i.imageUrl || null,
        isVerified: false,
        aiAuthenticityScore: aiScore.score,
        aiFlag: aiScore.flag,
        aiReason: aiScore.reason,
        status: "approved",
        source: "internal",
      }).select().single(),
    );
    await recalculateTrustScore(i.businessId);
    return { id: Number(inserted?.id), aiScore };
  },

  "review.getStats": async (input) => {
    const all = await rows(
      supabase.from("reviews").select("*").eq("businessId", input!.businessId),
    );
    const total = all.length;
    const genuine = all.filter((r) => r.aiFlag === "genuine").length;
    const suspicious = all.filter((r) => r.aiFlag === "suspicious").length;
    const fake = all.filter((r) => r.aiFlag === "fake").length;
    const avgRating = total > 0 ? all.reduce((s, r) => s + r.rating, 0) / total : 0;
    const verifiedCount = all.filter((r) => r.isVerified).length;
    return { total, genuine, suspicious, fake, avgRating: Math.round(avgRating * 10) / 10, verifiedCount };
  },

  "review.getReplyDraft": async (input) => {
    const reviewId = input!.reviewId;
    const existing = await one(
      supabase.from("review_replies").select("*").eq("reviewId", reviewId).maybeSingle(),
    );
    if (existing) return existing;

    const review = await one(
      supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle(),
    );
    if (!review) return null;

    const draft = generateReplyDraft(review);
    const inserted = await one(
      supabase.from("review_replies").insert({
        reviewId,
        aiDraft: draft,
        finalText: draft,
        published: false,
      }).select().single(),
    );
    return inserted;
  },

  "review.publishReply": async (input) => {
    const i = input!;
    const { error } = await supabase
      .from("review_replies")
      .update({ finalText: i.finalText, published: true })
      .eq("id", i.replyId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // ═══════════════════════════ AD ANALYSIS ════════════════════════
  "adAnalysis.list": async (input) => {
    const limit = input?.limit ?? 20;
    let q = supabase.from("ad_analysis").select("*");
    if (input?.sourceType) q = q.eq("sourceType", input.sourceType);
    return rows(q.order("createdAt", { ascending: false }).limit(limit));
  },

  "adAnalysis.getById": async (input) => {
    return one(supabase.from("ad_analysis").select("*").eq("id", input!.id).maybeSingle());
  },

  "adAnalysis.create": async (input) => {
    const i = input!;
    const analysis = simulateAdAnalysis(i.sourceType);
    const inserted = await one(
      supabase.from("ad_analysis").insert({
        sourceType: i.sourceType,
        mediaUrl: i.mediaUrl || null,
        sourceLink: i.sourceLink || null,
        submittedBy: i.submittedBy || null,
        businessId: i.businessId || null,
        extractedClaims: analysis.claims,
        honestyScore: analysis.honestyScore,
        mismatches: analysis.mismatches,
        manipulationFlags: analysis.flags,
        aiSummary: analysis.summary,
      }).select().single(),
    );
    return { id: Number(inserted?.id), ...analysis };
  },

  "adAnalysis.stats": async () => {
    const all = await rows(supabase.from("ad_analysis").select("*"));
    const total = all.length;
    const avgHonesty = total > 0
      ? Math.round(all.reduce((s, a) => s + (a.honestyScore || 0), 0) / total)
      : 0;
    const flaggedCount = all.filter((a) => (a.manipulationFlags?.length || 0) > 0).length;
    const byType = {
      instagram_video: all.filter((a) => a.sourceType === "instagram_video").length,
      telegram_post: all.filter((a) => a.sourceType === "telegram_post").length,
      telegram_channel: all.filter((a) => a.sourceType === "telegram_channel").length,
      image: all.filter((a) => a.sourceType === "image").length,
    };
    return { total, avgHonesty, flaggedCount, byType };
  },

  // ═══════════════════════════ MARKET ═════════════════════════════
  "market.index": async (input) => {
    let q = supabase.from("market_index").select("*");
    if (input?.category) q = q.eq("category", input.category);
    if (input?.region) q = q.eq("region", input.region);
    return rows(q.order("computedAt", { ascending: false }));
  },

  "market.priceTrend": async (input) => {
    const days = input?.days ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const entries = await rows(
      supabase.from("price_entries").select("*")
        .eq("productId", input!.productId)
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
    );
    const chartData = entries.map((e) => ({
      date: new Date(e.createdAt).toISOString().split("T")[0],
      price: Number(e.price),
    }));
    if (entries.length >= 2) {
      const first = Number(entries[0].price);
      const last = Number(entries[entries.length - 1].price);
      const change = ((last - first) / first) * 100;
      const avg = entries.reduce((s, e) => s + Number(e.price), 0) / entries.length;
      return { chartData, trend: { change: Math.round(change * 100) / 100, avg: Math.round(avg) } };
    }
    return { chartData, trend: { change: 0, avg: 0 } };
  },

  "market.cheapestByProduct": async (input) => {
    const products = await rows(supabase.from("products").select("*"));
    const businesses = await rows(supabase.from("businesses").select("*"));
    const prodMap = new Map(products.map((p) => [p.id, p]));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));

    if (input?.productId) {
      const entries = await rows(
        supabase.from("price_entries").select("*")
          .eq("productId", input.productId)
          .order("price", { ascending: true })
          .limit(5),
      );
      return entries.map((e) => ({
        entry: e,
        product: prodMap.get(e.productId) ?? null,
        business: e.businessId ? bizMap.get(e.businessId) ?? null : null,
      }));
    }

    const entries = await rows(
      supabase.from("price_entries").select("*").order("price", { ascending: true }).limit(20),
    );
    const seen = new Set<number>();
    return entries
      .filter((e) => {
        if (!e.productId || seen.has(e.productId)) return false;
        seen.add(e.productId);
        return true;
      })
      .map((e) => ({
        entry: e,
        product: prodMap.get(e.productId) ?? null,
        business: e.businessId ? bizMap.get(e.businessId) ?? null : null,
      }));
  },

  "market.summary": async () => {
    const [businesses, reviews, prices] = await Promise.all([
      rows(supabase.from("businesses").select("*")),
      rows(supabase.from("reviews").select("aiFlag")),
      rows(supabase.from("price_entries").select("createdAt")),
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const avgTrust = businesses.length > 0
      ? businesses.reduce((s, b) => s + (b.trustScore || 0), 0) / businesses.length
      : 0;
    return {
      totalBusinesses: businesses.length,
      avgTrustScore: Math.round(avgTrust),
      totalReviews: reviews.length,
      totalPrices: prices.length,
      fakeReviewsCaught: reviews.filter((r) => r.aiFlag === "fake").length,
      priceEntriesToday: prices.filter((p) => new Date(p.createdAt) >= today).length,
    };
  },

  // ═══════════════════════════ ANALYTICS ══════════════════════════
  "analytics.fakeReviewHeatmap": async () => {
    const reviews = await rows(supabase.from("reviews").select("*"));
    const businesses = await rows(supabase.from("businesses").select("*"));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));

    const heatmapMap = new Map<string, { total: number; fake: number; suspicious: number; genuine: number }>();
    for (const r of reviews) {
      const biz = bizMap.get(r.businessId);
      if (!biz?.region || !biz?.category) continue;
      const key = `${biz.region}|${biz.category}`;
      const e = heatmapMap.get(key) || { total: 0, fake: 0, suspicious: 0, genuine: 0 };
      e.total++;
      if (r.aiFlag === "fake") e.fake++;
      else if (r.aiFlag === "suspicious") e.suspicious++;
      else if (r.aiFlag === "genuine") e.genuine++;
      heatmapMap.set(key, e);
    }
    const heatmap = Array.from(heatmapMap.entries()).map(([key, data]) => {
      const [region, category] = key.split("|");
      const fakeRate = data.total > 0 ? Math.round((data.fake / data.total) * 100) : 0;
      return { region, category, ...data, fakeRate, riskLevel: fakeRate > 30 ? "high" : fakeRate > 15 ? "medium" : "low" };
    });
    return heatmap.sort((a, b) => b.fakeRate - a.fakeRate);
  },

  "analytics.shadowEconomySignals": async () => {
    const businesses = await rows(supabase.from("businesses").select("*"));
    const reviews = await rows(supabase.from("reviews").select("businessId"));
    const prices = await rows(supabase.from("price_entries").select("businessId"));

    const reviewMap = new Map<number, number>();
    for (const r of reviews) reviewMap.set(r.businessId, (reviewMap.get(r.businessId) || 0) + 1);
    const priceMap = new Map<number, number>();
    for (const p of prices) priceMap.set(p.businessId, (priceMap.get(p.businessId) || 0) + 1);

    const signals = businesses.map((biz) => {
      const reviewCount = reviewMap.get(biz.id) || 0;
      const priceCount = priceMap.get(biz.id) || 0;
      const trustScore = biz.trustScore || 0;
      const activityScore = Math.min((reviewCount + priceCount) / 2, 50);
      const inverseTrust = 100 - trustScore;
      const anomalyScore = Math.round(inverseTrust * 0.6 + activityScore * 0.4);
      let flag: "none" | "low" | "medium" | "high" = "none";
      if (anomalyScore > 60) flag = "high";
      else if (anomalyScore > 40) flag = "medium";
      else if (anomalyScore > 25) flag = "low";
      return {
        businessId: biz.id,
        businessName: biz.name,
        type: biz.type,
        region: biz.region,
        trustScore,
        reviewCount,
        priceCount,
        claimed: biz.claimed,
        anomalyScore,
        flag,
        reason: flag !== "none" ? getAnomalyReason(trustScore, reviewCount, priceCount, biz.claimed) : null,
      };
    });
    return signals.filter((s) => s.flag !== "none").sort((a, b) => b.anomalyScore - a.anomalyScore);
  },

  "analytics.reviewSentimentTimeline": async (input) => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const businessReviews = await rows(
      supabase.from("reviews").select("*")
        .eq("businessId", input!.businessId)
        .gte("createdAt", since)
        .order("createdAt", { ascending: true }),
    );
    const weekMap = new Map<string, { date: string; positive: number; neutral: number; negative: number; fake: number }>();
    for (const r of businessReviews) {
      const date = new Date(r.createdAt);
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      const e = weekMap.get(weekKey) || { date: weekKey, positive: 0, neutral: 0, negative: 0, fake: 0 };
      if (r.aiFlag === "fake") e.fake++;
      else if (r.rating >= 4) e.positive++;
      else if (r.rating === 3) e.neutral++;
      else e.negative++;
      weekMap.set(weekKey, e);
    }
    return Array.from(weekMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  },

  "analytics.ratingDistribution": async (input) => {
    const businessReviews = await rows(
      supabase.from("reviews").select("rating").eq("businessId", input!.businessId),
    );
    return [1, 2, 3, 4, 5].map((star) => ({
      rating: star,
      count: businessReviews.filter((r) => r.rating === star).length,
    }));
  },

  "analytics.overview": async () => {
    const businesses = await rows(supabase.from("businesses").select("*"));
    const reviews = await rows(supabase.from("reviews").select("aiFlag"));
    const ads = await rows(supabase.from("ad_analysis").select("honestyScore"));

    const typeDistMap = new Map<string, number>();
    for (const b of businesses) typeDistMap.set(b.type, (typeDistMap.get(b.type) || 0) + 1);
    const avgHonesty = ads.length > 0
      ? Math.round(ads.reduce((s, a) => s + (a.honestyScore || 0), 0) / ads.length)
      : 0;
    return {
      totalBusinesses: businesses.length,
      totalReviews: reviews.length,
      fakeReviews: reviews.filter((r) => r.aiFlag === "fake").length,
      suspiciousReviews: reviews.filter((r) => r.aiFlag === "suspicious").length,
      adAnalyses: ads.length,
      avgAdHonesty: avgHonesty,
      unclaimedBusinesses: businesses.filter((b) => !b.claimed).length,
      typeDistribution: Array.from(typeDistMap.entries()).map(([type, count]) => ({ type, count })),
    };
  },
};

// ─── Trust score qayta hisoblash ───────────────────────────────────────────
async function recalculateTrustScore(businessId: number) {
  const all = await rows(supabase.from("reviews").select("*").eq("businessId", businessId));
  if (all.length === 0) return;
  const genuineCount = all.filter((r) => r.aiFlag === "genuine").length;
  const verifiedCount = all.filter((r) => r.isVerified).length;
  const genuinenessRatio = genuineCount / all.length;
  const verificationRatio = verifiedCount / all.length;
  const avgRating = all.reduce((s, r) => s + r.rating, 0) / all.length;
  const trustScore = Math.round(genuinenessRatio * 40 + verificationRatio * 30 + (avgRating / 5) * 30);
  await supabase
    .from("businesses")
    .update({ trustScore: Math.min(100, Math.max(0, trustScore)) })
    .eq("id", businessId);
}

// ─── AI simulyatsiya (sharh haqiqiyligini baholash) ─────────────────────────
function simulateAIAnalysis(text: string): { score: number; flag: "genuine" | "suspicious" | "fake"; reason: string } {
  const suspiciousPatterns = [/!!!/g, /eng zo'r/gi, /hammaga tavsiya/gi, /100%/gi, /ajoyib/gi, /zo'r xizmat/gi, /juda mamnun/gi, /superlativ/gi];
  const genuinePatterns = [/chunki/gi, /biroz/gi, /lekin/gi, /ammo/gi, /hafta/gi, /kun/gi, /to'g'ri/gi, /muammo/gi, /iflos/gi, /yomon/gi, /eskirgan/gi];
  const hasSuspicious = suspiciousPatterns.some((p) => p.test(text));
  const hasGenuine = genuinePatterns.some((p) => p.test(text));
  const exclamationCount = (text.match(/!/g) || []).length;
  const wordCount = text.split(/\s+/).length;

  if (exclamationCount > 3 || (hasSuspicious && !hasGenuine) || wordCount < 8) {
    if (exclamationCount > 5 || wordCount < 5) {
      return { score: Math.floor(Math.random() * 20) + 15, flag: "fake", reason: "Spam xususiyatlari, noyozlik" };
    }
    return { score: Math.floor(Math.random() * 25) + 30, flag: "suspicious", reason: "Umumiy iboralar, konkret ma'lumot yo'q" };
  }
  if (hasGenuine || wordCount > 15) {
    return { score: Math.floor(Math.random() * 15) + 85, flag: "genuine", reason: getGenuineReason(text) };
  }
  return { score: Math.floor(Math.random() * 20) + 50, flag: "suspicious", reason: "Noma'lum xususiyatlar" };
}

function getGenuineReason(text: string): string {
  if (/narx|sifat|bahos/gi.test(text)) return "Narx-sifat tahlili";
  if (/reklama|haqiqat|emas/gi.test(text)) return "Reklama-haqiqat tafovuti";
  if (/kun|hafta|oy|yil/gi.test(text)) return "Voqealar tavsifi, vaqt belgisi";
  if (/muammo|shikoyat|past/gi.test(text)) return "Haqiqiy tanqid, konkret muammolar";
  return "Tabiiy til, konkret tajriba";
}

function generateReplyDraft(review: Row): string {
  const rating = review.rating;
  if (rating <= 2) {
    return "Hurmatli mijoz, xizmatimizdan qoniqmaganingiz uchun uzr so'raymiz. Aytilgan muammolarni hal qilish uchun biz bilan bog'laning. Sizning fikringiz biz uchun muhim.";
  }
  if (rating === 3) {
    return "Rahmat fikringiz uchun! Sizning tajribangizni yaxshilash uchun doim ishlayapmiz. Qo'shimcha takliflaringiz bo'lsa, marhamat.";
  }
  return "Ajoyib sharh uchun rahmat! Bizni tanlaganingizdan xursandmiz. Kelajakda ham xizmat ko'rsatishdan mamnun bo'lamiz.";
}

// ─── Ad analysis simulyatsiya ──────────────────────────────────────────────
function simulateAdAnalysis(_sourceType: string) {
  const score = Math.floor(Math.random() * 80) + 10;
  const claimPool = ["Toza plyaj", "Eng arzon narxlar", "Bepul transfer", "5 yulduzli xizmat", "100% tabiiy mahsulot", "Tez yetkazib berish", "Kafolatlangan sifat", "Cheksiz Wi-Fi", "Bepul nonushta", "Professional xizmat"];
  const mismatchPool = [
    { claim: "Toza plyaj", reality: "15 ta sharhda 'iflos' so'zi qayd etilgan", evidence: "Sharhlar tahlili" },
    { claim: "Eng arzon narxlar", reality: "Bozor narxidan 40% qimmat", evidence: "Narx taqqoslash" },
    { claim: "Bepul transfer", reality: "Transfer xizmati yashirin to'lov bilan", evidence: "Shartnoma tahlili" },
    { claim: "5 yulduzli xizmat", reality: "3 yulduzli mehmonxona", evidence: "Rasmiy ro'yxat" },
    { claim: "100% tabiiy", reality: "Sun'iy qo'shimchalar aniqlandi", evidence: "Laboratoriya tahlili" },
  ];
  const flagPool = ["stock_footage", "ai_generated", "wrong_location", "misleading_discount", "false_claims", "deepfake", "repetitive_promo"];

  const numClaims = Math.floor(Math.random() * 4) + 2;
  const claims: string[] = [];
  for (let i = 0; i < numClaims; i++) claims.push(claimPool[Math.floor(Math.random() * claimPool.length)]);

  const numMismatches = score < 50 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
  const mismatches: { claim: string; reality: string; evidence: string }[] = [];
  for (let i = 0; i < numMismatches; i++) mismatches.push(mismatchPool[Math.floor(Math.random() * mismatchPool.length)]);

  const numFlags = score < 40 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
  const flags: string[] = [];
  for (let i = 0; i < numFlags; i++) flags.push(flagPool[Math.floor(Math.random() * flagPool.length)]);

  let summary = "";
  if (score < 30) summary = `Reklama ${100 - score}% yolg'on. Asosiy da'volarning aksariyati haqiqatga mos emas. Ehtiyot bo'ling.`;
  else if (score < 60) summary = "Reklama qisman haqiqatga mos. Ba'zi da'volar oshirilgan yoki aniq emas. Qo'shimcha tekshirish tavsiya etiladi.";
  else summary = "Reklama asosan haqiqatga mos. Kichik nuanslar mavjud bo'lishi mumkin.";

  return { claims, mismatches, flags, honestyScore: score, summary };
}

// ─── Profile enrichment helperlari ─────────────────────────────────────────
function extractPositiveKeywords(reviewsList: Row[]): string[] {
  const keywordMap = new Map<string, number>();
  const positiveWords = ["zo'r", "ajoyib", "mazali", "sifatli", "tez", "arzon", "yangi", "toza", "qulay", "professional", "do'stona", "chiroyli", "go'zal", "yaxshi", "ishonchli", "halol", "tabiiy", "tarkibiy"];
  for (const r of reviewsList) {
    const text = (r.text || "").toLowerCase();
    for (const word of positiveWords) if (text.includes(word)) keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
  }
  return Array.from(keywordMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
}

function extractComplaints(reviewsList: Row[]): string[] {
  const complaintMap = new Map<string, number>();
  const complaintWords = ["qimmat", "pasty", "iflos", "yomon", "sekin", "issiq", "sovuq", "shovqin", "navbat", "kir", "eski", "buzilgan", "yolg'on"];
  for (const r of reviewsList) {
    const text = (r.text || "").toLowerCase();
    for (const word of complaintWords) if (text.includes(word)) complaintMap.set(word, (complaintMap.get(word) || 0) + 1);
  }
  return Array.from(complaintMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
}

function generateSuggestions(business: Row, keywords: string[], complaints: string[], avgRating: number) {
  const typeDesc: Record<string, string> = { market: "savdo markazi", tourism: "dam olish va sayyohlik joyi", service: "xizmat ko'rsatish markazi" };
  const desc = `${business.name} — ${business.region || "O'zbekiston"}ning yetakchi ${typeDesc[business.type] || "biznesi"}. ${keywords.length > 0 ? `Mijozlarimiz bizni ${keywords.join(", ")} sifatlarida yuqori baholaydi.` : ""} ${avgRating >= 4 ? "Yuqori baholar va mamnun mijozlar — bizning ustuvorligimiz." : avgRating >= 3 ? "Doimiy takomillashtirish maqsadida fikrlaringizni kutamiz." : "Sizning fikringiz biz uchun muhim — takomillashtirish ustida ishlayapmiz."}`;
  const categories: string[] = [];
  if (business.type === "market") categories.push("Mahalliy mahsulotlar", "Yangi oziq-ovqat", "Halol go'sht");
  else if (business.type === "tourism") categories.push("Ekoturizm", "Madaniy turizm", "Oilaviy dam olish");
  else categories.push("Professional xizmat", "Tez yetkazib berish", "24/7 qo'llab-quvvatlash");
  const faqs = [
    { question: "Ish vaqtlari qanday?", answer: "Dushanbadan Yakshanbagacha, ertalabki 9:00dan kechki 20:00gacha." },
    { question: "Buyurtma qandam beriladi?", answer: "Telefon orqali yoki onlayn platforma orqali buyurtma berishingiz mumkin." },
    ...(complaints.includes("qimmat") ? [{ question: "Chegirmalar bormi?", answer: "Doimiy mijozlarimiz uchun maxsus chegirmalar va bonus dasturlari mavjud." }] : []),
    ...(complaints.includes("sekin") ? [{ question: "Yetkazib berish qancha vaqt oladi?", answer: "Buyurtmalar 24 soat ichida yetkazib beriladi. Tezkor yetkazish xizmati mavjud." }] : []),
  ];
  return { description: desc, categories, faqs };
}

function getAnomalyReason(trustScore: number, reviewCount: number, priceCount: number, claimed: boolean | null): string {
  const reasons: string[] = [];
  if (trustScore < 50) reasons.push("Past ishonch ko'rsatkichi");
  if (reviewCount > 10 && !claimed) reasons.push("Faol sharhlar, lekin egallanmagan");
  if (priceCount === 0 && reviewCount > 5) reasons.push("Faol sharhlar, ammo narx ma'lumoti yo'q");
  if (trustScore < 30 && reviewCount > 3) reasons.push("Ko'p salbiy sharhlar");
  if (reasons.length === 0) reasons.push("Umumiy anomaly bali yuqori");
  return reasons.join("; ");
}
