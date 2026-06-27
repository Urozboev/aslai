/**
 * Biznes turiga qarab talab qilinadigan rasmlar (preset).
 * Har bir talab uchun AI (Gemini Vision) rasmda `mustContain` obyektlarini
 * aniqlashi kerak — aks holda rasm qabul qilinmaydi.
 */
export type PhotoRequirement = {
  id: string;
  label: string;
  /** Rasmda albatta ko'rinishi shart bo'lgan obyektlar (o'zbekcha) */
  mustContain: string[];
  hint: string;
};

export type PlaceKind = {
  id: string;
  label: string;
  /** Biznes bazadagi turi (enum) */
  type: "market" | "tourism" | "service";
  requirements: PhotoRequirement[];
};

export const PLACE_KINDS: PlaceKind[] = [
  {
    id: "dacha",
    label: "Dacha / Dam olish maskani",
    type: "tourism",
    requirements: [
      { id: "bedroom", label: "Yotoqxona", mustContain: ["krovat (yotoq) yoki divan"], hint: "Yotoq ko'rinib turishi kerak" },
      { id: "toilet", label: "Hojatxona", mustContain: ["unitaz", "rakovina (qo'l yuvgich)"], hint: "Unitaz va rakovina kadrga tushsin" },
      { id: "lounge", label: "Dam olish xonasi", mustContain: ["divan yoki stol-stullar"], hint: "Mehmon/dam olish xonasi" },
      { id: "kitchen", label: "Oshxona", mustContain: ["plita, rakovina yoki oshxona jihozi"], hint: "Oshxona jihozlari ko'rinsin" },
      { id: "yard", label: "Hovli / Basseyn", mustContain: ["ochiq hovli, bog' yoki basseyn"], hint: "Tashqi hudud yoki basseyn" },
    ],
  },
  {
    id: "hotel",
    label: "Mehmonxona",
    type: "tourism",
    requirements: [
      { id: "room", label: "Mehmon xonasi", mustContain: ["krovat (yotoq)"], hint: "Yotoq xonasi" },
      { id: "bathroom", label: "Hammom / Hojatxona", mustContain: ["unitaz", "dush yoki vanna", "rakovina"], hint: "Hammom jihozlari" },
      { id: "reception", label: "Qabulxona (reception)", mustContain: ["qabul stoli yoki lobbi"], hint: "Kirish/qabul qismi" },
    ],
  },
  {
    id: "restaurant",
    label: "Restoran / Kafe",
    type: "service",
    requirements: [
      { id: "hall", label: "Zal", mustContain: ["stol va stullar"], hint: "Mehmonlar zali" },
      { id: "kitchen", label: "Oshxona", mustContain: ["oshxona jihozi yoki plita"], hint: "Taom tayyorlanadigan joy" },
      { id: "toilet", label: "Hojatxona", mustContain: ["unitaz", "rakovina"], hint: "Mijozlar hojatxonasi" },
    ],
  },
  {
    id: "shop",
    label: "Do'kon / Market",
    type: "market",
    requirements: [
      { id: "front", label: "Do'kon kirishi", mustContain: ["do'kon kirishi yoki peshtaxta"], hint: "Old qism / kirish" },
      { id: "shelves", label: "Mahsulot javonlari", mustContain: ["mahsulotlar bilan javonlar"], hint: "Tovar javonlari" },
    ],
  },
];

export function getPlaceKind(id: string | null): PlaceKind | undefined {
  return PLACE_KINDS.find((k) => k.id === id);
}
