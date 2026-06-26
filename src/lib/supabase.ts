import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Aniq xato — kalitlar .env faylда yo'q bo'lsa darrov ko'rinadi
  throw new Error(
    "Supabase sozlanmagan. app/.env fayliga VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY qo'shing.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
