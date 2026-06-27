/**
 * Gemini AI client (browser). VITE_GEMINI_API_KEY .env dan o'qiladi.
 *
 * ⚠️ Xavfsizlik: bu kalit brauzer bundle'iga kiritiladi va ommaga ko'rinadi.
 * Google AI Studio'da kalitga HTTP referrer cheklovini (faqat o'z domeningiz)
 * qo'shing. Kalit bo'lmasa, ilova evristik (oddiy) tahlilga qaytadi.
 */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash";

export const isGeminiConfigured = Boolean(API_KEY);

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiMedia = { mimeType: string; base64: string };

const ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Asosiy so'rov — 503 (band) bo'lsa bir necha marta qayta uriniladi. */
async function request(body: unknown): Promise<string> {
  if (!API_KEY) throw new Error("Gemini API kaliti sozlanmagan");
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(ENDPOINT(MODEL, API_KEY), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const out = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("");
      if (!out) throw new Error("Gemini bo'sh javob qaytardi");
      return out as string;
    }
    const detail = await res.text().catch(() => "");
    lastErr = `Gemini ${res.status}: ${detail.slice(0, 300)}`;
    // 503/UNAVAILABLE — vaqtinchalik, qayta urinamiz
    if (res.status === 503 || res.status === 429) {
      await sleep(1200 * (attempt + 1));
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr || "Gemini so'rovi muvaffaqiyatsiz");
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

/** Birinchi to'liq (balanslangan) JSON obyektini topadi — string ichidagi {}, } ni hisobga olmaydi. */
function firstBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Matndan JSON ajratib oladi. Model fikrlash matni qo'shsa yoki JSON'ni
 * ```json``` bloki ichiga o'rasa ham ishlaydi.
 */
function extractJson<T>(text: string): T {
  const candidates: string[] = [];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim()); // 1) ```json ... ``` bloki
  const balanced = firstBalancedObject(text);
  if (balanced) candidates.push(balanced); // 2) birinchi balanslangan obyekt
  candidates.push(stripFences(text)); // 3) butun tozalangan matn
  for (const c of candidates) {
    try {
      return JSON.parse(c) as T;
    } catch {
      // keyingisini sinab ko'ramiz
    }
  }
  throw new Error("Gemini JSON qaytarmadi");
}

/** JSON qaytaruvchi so'rov (ixtiyoriy rasm/video bilan). */
export async function geminiJson<T>(prompt: string, media?: GeminiMedia): Promise<T> {
  const parts: Part[] = [{ text: prompt }];
  if (media) parts.push({ inlineData: { mimeType: media.mimeType, data: media.base64 } });
  const text = await request({
    contents: [{ parts }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
  });
  return extractJson<T>(text);
}

/**
 * URL Context tool bilan JSON qaytaruvchi so'rov — Gemini serverda berilgan
 * URL(lar)ni o'qib (CORS muammosiz) kontentni tahlil qiladi. Telegram post/kanal
 * va xarita havolalari uchun ishlatiladi. (tools bilan responseMimeType ishlatilmaydi.)
 *
 * opts.search=true bo'lsa Google Search grounding ham yoqiladi — URL ochilmasa
 * (masalan Google Maps "unsafe" deb bloklansa) joyni qidiruv orqali topadi.
 */
export async function geminiJsonWithUrls<T>(
  prompt: string,
  urls: string[],
  opts?: { search?: boolean },
): Promise<T> {
  const fullPrompt =
    `${prompt}\n\nQuyidagi URL(lar) mazmunini o'qib tahlil qil: ${urls.join(", ")}\n` +
    `Javobni FAQAT toza JSON ko'rinishida ber — markdown, izoh yoki qo'shimcha matnsiz.`;
  const tools: unknown[] = [{ urlContext: {} }];
  if (opts?.search) tools.push({ googleSearch: {} });
  const text = await request({
    contents: [{ parts: [{ text: fullPrompt }] }],
    tools,
    generationConfig: { temperature: 0.4 },
  });
  return extractJson<T>(text);
}

/** Google Search grounding bilan JSON qaytaruvchi so'rov (URL'siz qidiruv). */
export async function geminiJsonSearch<T>(prompt: string): Promise<T> {
  const text = await request({
    contents: [{ parts: [{ text: `${prompt}\nJavobni FAQAT toza JSON ko'rinishida ber.` }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.4 },
  });
  return extractJson<T>(text);
}

/** Oddiy matn qaytaruvchi so'rov. */
export async function geminiText(prompt: string): Promise<string> {
  const text = await request({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 },
  });
  return text.trim();
}
