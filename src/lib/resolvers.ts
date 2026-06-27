/**
 * Resolvers — eski tRPC/Drizzle router mantig'i endi to'g'ridan-to'g'ri
 * Supabase (PostgREST) ustida ishlaydi. Har bir kalit "router.procedure"
 * yo'liga mos keladi va eski API bilan bir xil shakldagi ma'lumot qaytaradi.
 */
import { supabase } from "./supabase";
import {
  isGeminiConfigured,
  geminiJson,
  geminiJsonWithUrls,
  geminiJsonSearch,
  geminiText,
  type GeminiMedia,
} from "./gemini";

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
    const photos = (i.photos ?? []) as Row[];
    const inserted = await one(
      supabase.from("businesses").insert({
        name: i.name,
        type: i.type,
        category: i.category || null,
        region: i.region || null,
        description: i.description || null,
        lat: i.lat || null,
        lng: i.lng || null,
        photos: photos.map((p) => ({ label: p.label, url: p.url })),
      }).select().single(),
    );
    const businessId = Number(inserted?.id);
    // Har bir tasdiqlangan rasmni "Haqiqat tarixi"ga yozamiz
    if (businessId && photos.length > 0) {
      await supabase.from("place_history").insert(
        photos.map((p) => ({
          businessId,
          kind: "photo",
          source: "user",
          label: p.label,
          url: p.url,
          conditionScore: p.conditionScore ?? null,
          note: p.conditionNote ?? null,
        })),
      );
    }
    return { id: businessId, ...i };
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
    const aiScore = await analyzeReviewAuthenticity(i.text || "");
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

    const draft = await generateAiReply(review);
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
    const media: GeminiMedia | undefined =
      i.mediaBase64 && i.mediaMimeType
        ? { base64: i.mediaBase64, mimeType: i.mediaMimeType }
        : undefined;
    const analysis = await analyzeAd(i.sourceType, i.sourceLink, media);
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

  // AI sharhlar jamlamasi (afzalliklar / kamchiliklar / kimlar uchun)
  "review.summary": async (input) => {
    const all = await rows(
      supabase.from("reviews").select("rating,text,aiFlag").eq("businessId", input!.businessId),
    );
    return summarizeReviews(all);
  },

  // Shaxsiy AI tavsiya (oila / talaba / juftlik uchun)
  "business.recommend": async (input) => {
    const audience = (input?.audience as string) || "umumiy";
    const businesses = await rows(
      supabase.from("businesses").select("*").order("trustScore", { ascending: false }).limit(20),
    );
    return recommendBusinesses(audience, businesses);
  },

  // Google/Yandex Maps havolasidan joy va sharhlar bo'yicha umumiy xulosa
  "place.summary": async (input) => {
    return analyzePlace((input?.url as string) || "");
  },

  // "Haqiqat tarixi" — joy holatining vaqt bo'yicha yozuvlari + trend
  "place.history": async (input) => {
    const businessId = input!.businessId;
    const entries = await rows(
      supabase.from("place_history").select("*")
        .eq("businessId", businessId)
        .order("capturedAt", { ascending: false }),
    );
    const scored = entries.filter((e) => typeof e.conditionScore === "number");
    let trend: Row | null = null;
    if (scored.length >= 1) {
      const latest = scored[0];
      const earliest = scored[scored.length - 1];
      const delta = (latest.conditionScore ?? 0) - (earliest.conditionScore ?? 0);
      trend = {
        latest: latest.conditionScore,
        earliest: earliest.conditionScore,
        delta,
        direction: delta > 5 ? "improved" : delta < -5 ? "declined" : "stable",
        count: scored.length,
      };
    }
    return { entries, trend };
  },

  // Mavjud biznesga yangi (dated) holat rasmi qo'shish
  "place.addPhoto": async (input) => {
    const i = input!;
    const inserted = await one(
      supabase.from("place_history").insert({
        businessId: i.businessId,
        kind: "photo",
        source: "user",
        label: i.label || "Umumiy",
        url: i.url,
        conditionScore: i.conditionScore ?? null,
        note: i.note ?? null,
      }).select().single(),
    );
    return inserted;
  },

  // Google/Yandex Maps havolasidan holat xulosasini tarixga qo'shish
  "place.enrichFromMap": async (input) => {
    const i = input!;
    const result = await analyzeMapCondition(i.url as string);
    const source = /yandex/i.test(String(i.url)) ? "yandex" : "google";
    await supabase.from("place_history").insert({
      businessId: i.businessId,
      kind: "map",
      source,
      label: result.name || "Xarita",
      url: null,
      conditionScore: result.conditionScore,
      note: result.note,
    });
    return result;
  },

  // Dam olish/mehmonxona uchun atrofdagi (hududiy) narxlar
  "place.nearbyPrices": async (input) => {
    const i = input!;
    return analyzeNearbyPrices(i.name, i.region, i.category, i.type);
  },

  // Chek/narx skaner — OCR + atrofdagi narxga nisbatan baho
  "price.checkReceipt": async (input) => {
    const i = input!;
    const media =
      i.base64 && i.mimeType ? ({ base64: i.base64, mimeType: i.mimeType } as GeminiMedia) : undefined;
    return checkReceipt(media, i.businessName, i.region, i.category);
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

// ─── Gemini AI helperlari (kalit bo'lmasa evristik fallback) ────────────────
async function analyzeReviewAuthenticity(
  text: string,
): Promise<{ score: number; flag: "genuine" | "suspicious" | "fake"; reason: string }> {
  if (!isGeminiConfigured || !text.trim()) return simulateAIAnalysis(text);
  try {
    const res = await geminiJson<{ score: number; flag: string; reason: string }>(
      `Sen O'zbek bozori sharhlari uchun soxta sharh va manipulyatsiya aniqlovchisan. Quyidagi sharhni tahlil qil va FAQAT JSON qaytar: {"score": 0-100 (haqiqiylik, yuqori=haqiqiy), "flag": "genuine"|"suspicious"|"fake", "reason": "qisqa o'zbekcha sabab"}. E'tibor ber: umumiy maqtov, haddan ortiq undov, botga o'xshash naqsh, his-tuyg'u nomuvofiqligi (sentiment), aniqlik yo'qligi.\n\nSharh: """${text}"""`,
    );
    const flag = (["genuine", "suspicious", "fake"].includes(res.flag) ? res.flag : "suspicious") as
      | "genuine"
      | "suspicious"
      | "fake";
    return {
      score: Math.max(0, Math.min(100, Math.round(res.score))),
      flag,
      reason: res.reason || "AI tahlili",
    };
  } catch {
    return simulateAIAnalysis(text);
  }
}

async function generateAiReply(review: Row): Promise<string> {
  if (!isGeminiConfigured) return generateReplyDraft(review);
  try {
    const reply = await geminiText(
      `Sen biznes egasisan va mijoz sharhiga professional, hamdard javob yozyapsan. O'zbek tilida 2-3 jumla javob yoz. Faqat javob matnini qaytar.\n\nBaho: ${review.rating}/5\nSharh: """${review.text || ""}"""`,
    );
    return reply || generateReplyDraft(review);
  } catch {
    return generateReplyDraft(review);
  }
}

type AdResult = {
  claims: string[];
  honestyScore: number;
  mismatches: { claim: string; reality: string; evidence: string }[];
  flags: string[];
  summary: string;
};

// Telegram havolasini ochiq web-preview (t.me/s/...) ko'rinishiga keltiradi,
// shunda Gemini URL-context uni o'qiy oladi.
function normalizeTelegramUrl(link: string): string {
  const m = link.match(/^https?:\/\/t\.me\/(.+)$/i);
  if (!m) return link;
  const rest = m[1];
  if (rest.startsWith("s/")) return `https://t.me/${rest}`;
  return `https://t.me/s/${rest}`;
}

const AD_JSON_SHAPE =
  '{"claims": ["reklamadagi asosiy da\'volar"], "honestyScore": 0-100 (haqqoniylik), "mismatches": [{"claim":"da\'vo","reality":"haqiqat","evidence":"dalil"}], "flags": ["faqat shulardan: stock_footage, ai_generated, wrong_location, misleading_discount, false_claims, deepfake, repetitive_promo"], "summary": "o\'zbekcha qisqa xulosa"}';

async function analyzeAd(
  sourceType: string,
  sourceLink: string | undefined,
  media: GeminiMedia | undefined,
): Promise<AdResult> {
  if (!isGeminiConfigured || (!media && !sourceLink)) return simulateAdAnalysis(sourceType);

  const normalize = (res: Partial<AdResult>): AdResult => ({
    claims: res.claims ?? [],
    mismatches: res.mismatches ?? [],
    flags: res.flags ?? [],
    honestyScore: Math.max(0, Math.min(100, Math.round(res.honestyScore ?? 50))),
    summary: res.summary ?? "",
  });

  try {
    // 1) Rasm/video bo'lsa — Computer Vision (inline media)
    if (media) {
      const prompt = `Sen reklama haqqoniyligini baholovchisan (Computer Vision: "Reklama vs Real borliq"). Berilgan rasm/videoni tahlil qil. FAQAT JSON qaytar:
${AD_JSON_SHAPE}.
Vizual haqiqiylikni bahola: stock/AI-generatsiya belgilari, joy mosligi, manipulyatsiya, tozalik/eskirish holati.${
        sourceLink ? `\nQo'shimcha kontekst: ${sourceLink}` : ""
      }`;
      return normalize(await geminiJson<Partial<AdResult>>(prompt, media));
    }

    // 2) Havola bo'lsa (telegram post/kanal va h.k.) — URL-context bilan o'qib tahlil
    const url = normalizeTelegramUrl(sourceLink!);
    const prompt = `Sen reklama/post haqqoniyligini baholovchisan. Berilgan havola (Telegram post yoki kanal) mazmunini o'qib tahlil qil: da'volar, chegirma/aksiya shartlari, mubolag'a, manipulyatsiya va yolg'on belgilari. FAQAT JSON qaytar:
${AD_JSON_SHAPE}.`;
    return normalize(await geminiJsonWithUrls<Partial<AdResult>>(prompt, [url]));
  } catch {
    return simulateAdAnalysis(sourceType);
  }
}

async function summarizeReviews(reviewList: Row[]) {
  const count = reviewList.length;
  if (count === 0) {
    return { pros: [], cons: [], bestFor: [], priceQuality: "", summary: "Hozircha sharhlar yo'q.", count };
  }
  const avg = reviewList.reduce((s, r) => s + (r.rating || 0), 0) / count;
  if (!isGeminiConfigured) {
    return {
      pros: avg >= 4 ? ["Mijozlar asosan mamnun"] : [],
      cons: avg < 3 ? ["Bir nechta salbiy sharhlar mavjud"] : [],
      bestFor: [],
      priceQuality: avg >= 4 ? "Narx-sifat nisbati yaxshi" : "Narx-sifat o'rtacha",
      summary: `${count} ta sharh, o'rtacha baho ${Math.round(avg * 10) / 10}/5. To'liq AI tahlili uchun Gemini kalitini qo'shing.`,
      count,
    };
  }
  try {
    const text = reviewList.slice(0, 200).map((r) => `[${r.rating}/5] ${r.text || ""}`).join("\n");
    const res = await geminiJson<{
      pros: string[];
      cons: string[];
      bestFor: string[];
      priceQuality: string;
      summary: string;
    }>(
      `Quyidagi mijoz sharhlarini (o'zbekcha) jamla. FAQAT JSON qaytar:
{"pros": ["3-5 ta afzallik"], "cons": ["3-5 ta kamchilik"], "bestFor": ["2-4 ta auditoriya: Oilalar, Talabalar, Juftliklar, Sayyohlar va h.k."], "priceQuality": "narx-sifat haqida 1 jumla o'zbekcha", "summary": "1-2 jumla umumiy xulosa o'zbekcha"}.

Sharhlar:
${text}`,
    );
    return {
      pros: res.pros ?? [],
      cons: res.cons ?? [],
      bestFor: res.bestFor ?? [],
      priceQuality: res.priceQuality ?? "",
      summary: res.summary ?? "",
      count,
    };
  } catch {
    return {
      pros: [],
      cons: [],
      bestFor: [],
      priceQuality: "",
      summary: `${count} ta sharh, o'rtacha ${Math.round(avg * 10) / 10}/5.`,
      count,
    };
  }
}

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

async function analyzePlace(url: string): Promise<PlaceResult> {
  const empty = (summary: string): PlaceResult => ({
    found: false,
    name: "",
    rating: 0,
    reviewCount: 0,
    summary,
    pros: [],
    cons: [],
    bestFor: [],
  });
  if (!url.trim()) return empty("Manzil havolasini kiriting.");
  if (!isGeminiConfigured) return empty("Joy tahlili uchun Gemini AI kalitini (.env) qo'shing.");
  try {
    const prompt = `Sen joylarni baholovchisan. Berilgan Google yoki Yandex Maps havolasidagi joyni aniqla. Havolani o'qishga harakat qil; agar ocholmasang (masalan Google Maps bloklasa), havoladagi joy nomini aniqlab Google qidiruv orqali top. Joy haqida umumiy ma'lumot va foydalanuvchi sharhlaridan xulosa ber. FAQAT JSON qaytar:
{"found": true yoki false, "name": "joy nomi", "rating": 0-5 o'rtacha baho, "reviewCount": taxminiy sharhlar soni, "summary": "o'zbekcha 2-3 jumla umumiy xulosa", "pros": ["3-5 afzallik"], "cons": ["2-4 kamchilik"], "bestFor": ["kimlar uchun mos: Oilalar, Juftliklar, Sayyohlar, Talabalar va h.k."]}.`;
    const res = await geminiJsonWithUrls<Partial<PlaceResult>>(prompt, [url], { search: true });
    return {
      found: res.found ?? Boolean(res.name),
      name: res.name ?? "",
      rating: Math.max(0, Math.min(5, Number(res.rating) || 0)),
      reviewCount: Math.max(0, Math.round(Number(res.reviewCount) || 0)),
      summary: res.summary ?? "",
      pros: res.pros ?? [],
      cons: res.cons ?? [],
      bestFor: res.bestFor ?? [],
    };
  } catch {
    return empty("Havolani tahlil qilib bo'lmadi. Havola to'g'ri va ochiq ekanini tekshiring.");
  }
}

// ─── Haqiqat tarixi: xaritadan holat xulosasi ──────────────────────────────
type MapCondition = { found: boolean; name: string; conditionScore: number; note: string };

async function analyzeMapCondition(url: string): Promise<MapCondition> {
  if (!isGeminiConfigured || !url.trim()) {
    return { found: false, name: "", conditionScore: 0, note: "Gemini kaliti yoki havola yo'q." };
  }
  try {
    const prompt = `Berilgan Google yoki Yandex Maps havolasidagi joyni aniqla (ocholmasang Google qidiruv orqali top). Joydagi RASMLAR va SHARHLARga qarab uning HOZIRGI jismoniy holatini (tozalik, yangilik, saranjom-sarishtalik) bahola. FAQAT JSON: {"found": true/false, "name": "joy nomi", "conditionScore": 0-100 (joy holati), "note": "o'zbekcha 1-2 jumla — rasm va sharhlardan ko'ringan holat"}.`;
    const res = await geminiJsonWithUrls<Partial<MapCondition>>(prompt, [url], { search: true });
    return {
      found: res.found ?? Boolean(res.name),
      name: res.name ?? "",
      conditionScore: Math.max(0, Math.min(100, Math.round(Number(res.conditionScore) || 0))),
      note: res.note ?? "",
    };
  } catch {
    return { found: false, name: "", conditionScore: 0, note: "Xaritani tahlil qilib bo'lmadi." };
  }
}

// ─── Atrofdagi (hududiy) narxlar ────────────────────────────────────────────
type NearbyPrices = {
  found: boolean;
  avgText: string;
  min: number;
  max: number;
  currency: string;
  verdict: string;
  note: string;
};

async function analyzeNearbyPrices(
  name: string,
  region: string | undefined,
  category: string | undefined,
  type: string | undefined,
): Promise<NearbyPrices> {
  const empty = (note: string): NearbyPrices => ({
    found: false, avgText: "", min: 0, max: 0, currency: "so'm", verdict: "", note,
  });
  if (!isGeminiConfigured) return empty("Atrofdagi narxlar uchun Gemini AI kalitini qo'shing.");
  try {
    const prompt = `Sen narx-bozor tahlilchisisan. "${name}" (${type || ""}, ${category || ""}) ${
      region || "O'zbekiston"
    } hududidagi joy. Shu ATROFDAGI o'xshash joylar (dam olish maskani / mehmonxona)ning odatiy narxlarini Google qidiruv orqali top va o'rtacha narx oralig'ini ber. FAQAT JSON: {"found": true/false, "avgText": "o'rtacha narx (masalan: 350 000 - 600 000 so'm/kecha)", "min": eng past son, "max": eng yuqori son, "currency": "so'm", "verdict": "arzon | o'rtacha | qimmat", "note": "o'zbekcha 1-2 jumla izoh va manba"}.`;
    const res = await geminiJsonSearch<Partial<NearbyPrices>>(prompt);
    return {
      found: res.found ?? true,
      avgText: res.avgText ?? "",
      min: Math.max(0, Math.round(Number(res.min) || 0)),
      max: Math.max(0, Math.round(Number(res.max) || 0)),
      currency: res.currency ?? "so'm",
      verdict: res.verdict ?? "",
      note: res.note ?? "",
    };
  } catch {
    return empty("Atrofdagi narxlarni hisoblab bo'lmadi.");
  }
}

// ─── Chek / narx skaner (OCR + atrofga nisbatan baho) ───────────────────────
type ReceiptCheck = {
  items: { name: string; price: number }[];
  total: number;
  hiddenFees: string[];
  verdict: string;
  note: string;
};

async function checkReceipt(
  media: GeminiMedia | undefined,
  businessName: string | undefined,
  region: string | undefined,
  category: string | undefined,
): Promise<ReceiptCheck> {
  const empty = (note: string): ReceiptCheck => ({
    items: [], total: 0, hiddenFees: [], verdict: "", note,
  });
  if (!isGeminiConfigured) return empty("Chek tahlili uchun Gemini AI kalitini qo'shing.");
  if (!media) return empty("Chek yoki narx yorlig'i rasmini yuklang.");
  try {
    const prompt = `Sen chek/narx tahlilchisisan. Bu rasmda chek yoki narx yorlig'i bor. Matnni o'qi (o'zbek/rus), mahsulot-narxlarni ajrat. ${
      businessName ? `Joy: ${businessName}. ` : ""
    }${region ? `Hudud: ${region}. ` : ""}${
      category ? `Toifa: ${category}. ` : ""
    }Narxlarni shu hududdagi odatiy narxlar bilan taqqosla. FAQAT JSON: {"items": [{"name":"mahsulot","price": son}], "total": umumiy son, "hiddenFees": ["yashirin/qo'shimcha to'lovlar bo'lsa"], "verdict": "odil | biroz qimmat | haddan qimmat", "note": "o'zbekcha 1-2 jumla — narx atrofga nisbatan qanday, sayyoh uchun oshirilganmi"}.`;
    const res = await geminiJson<Partial<ReceiptCheck>>(prompt, media);
    return {
      items: res.items ?? [],
      total: Math.max(0, Math.round(Number(res.total) || 0)),
      hiddenFees: res.hiddenFees ?? [],
      verdict: res.verdict ?? "",
      note: res.note ?? "",
    };
  } catch (err) {
    return empty(err instanceof Error ? err.message : "Chekni tahlil qilib bo'lmadi.");
  }
}

async function recommendBusinesses(audience: string, businesses: Row[]) {
  const fallback = {
    recommendations: businesses.slice(0, 3).map((b) => ({
      name: b.name,
      reason: `Yuqori ishonch reytingi (${b.trustScore || 0})`,
    })),
  };
  if (!isGeminiConfigured || businesses.length === 0) return fallback;
  try {
    const list = businesses
      .map((b) => `- ${b.name} (${b.type}, ${b.category || ""}, ${b.region || ""}, ishonch: ${b.trustScore || 0})`)
      .join("\n");
    const res = await geminiJson<{ recommendations: { name: string; reason: string }[] }>(
      `Quyidagi bizneslar ro'yxatidan "${audience}" auditoriyasi uchun eng mos 3 tasini tanla. FAQAT JSON qaytar: {"recommendations": [{"name":"biznes nomi","reason":"o'zbekcha qisqa sabab"}]}.\n\nBizneslar:\n${list}`,
    );
    return { recommendations: res.recommendations ?? fallback.recommendations };
  } catch {
    return fallback;
  }
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
