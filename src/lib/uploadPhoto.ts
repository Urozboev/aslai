import { supabase } from "./supabase";

const BUCKET = "business-photos";

/** base64 (prefiksiz) ni Supabase Storage'ga yuklab, public URL qaytaradi. */
export async function uploadBusinessPhoto(base64: string, mimeType: string): Promise<string> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Rasmni yuklab bo'lmadi: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
