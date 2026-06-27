import { isGeminiConfigured, geminiJson } from "./gemini";

export type PhotoVerification = {
  match: boolean;
  detected: string[];
  missing: string[];
  feedback: string;
  confidence: number;
  /** Joyning holati (tozalik/yangilik) 0-100 — "Haqiqat tarixi" uchun */
  conditionScore: number;
  conditionNote: string;
};

/**
 * Rasmni Gemini Vision orqali tekshiradi: rasm `label` joyini ko'rsatadimi va
 * `mustContain` obyektlari mavjudmi. Gemini kaliti bo'lmasa — tekshiruvsiz qabul.
 */
export async function verifyPhoto(
  base64: string,
  mimeType: string,
  label: string,
  mustContain: string[],
): Promise<PhotoVerification> {
  if (!isGeminiConfigured) {
    return {
      match: true,
      detected: [],
      missing: [],
      feedback: "Gemini AI kaliti yo'q — rasm tekshiruvsiz qabul qilindi.",
      confidence: 0,
      conditionScore: 0,
      conditionNote: "",
    };
  }
  try {
    const prompt = `Sen joy rasmlarini tekshiruvchisan. Bu rasm "${label}" joyini ko'rsatishi va unda quyidagi obyektlar bo'lishi kerak: ${mustContain.join(", ")}.
Rasmni diqqat bilan ko'r va FAQAT JSON qaytar:
{"match": true yoki false, "detected": ["rasmda topilgan kerakli obyektlar"], "missing": ["topilmagan kerakli obyektlar"], "confidence": 0-100, "feedback": "o'zbekcha qisqa izoh — nima yetishmasa", "conditionScore": 0-100 (joyning tozaligi/yangilik/saranjomlik darajasi), "conditionNote": "o'zbekcha 1 jumla — holat haqida"}.
"match" faqat barcha kerakli obyektlar aniq ko'ringandagina true bo'lsin.`;
    const res = await geminiJson<Partial<PhotoVerification>>(prompt, { base64, mimeType });
    return {
      match: Boolean(res.match),
      detected: res.detected ?? [],
      missing: res.missing ?? [],
      feedback: res.feedback ?? "",
      confidence: Math.max(0, Math.min(100, Math.round(Number(res.confidence) || 0))),
      conditionScore: Math.max(0, Math.min(100, Math.round(Number(res.conditionScore) || 0))),
      conditionNote: res.conditionNote ?? "",
    };
  } catch (err) {
    return {
      match: false,
      detected: [],
      missing: mustContain,
      feedback: err instanceof Error ? err.message : "Tekshirib bo'lmadi, qaytadan urinib ko'ring.",
      confidence: 0,
      conditionScore: 0,
      conditionNote: "",
    };
  }
}
