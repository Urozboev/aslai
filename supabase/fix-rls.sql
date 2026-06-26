-- ============================================================================
-- RLS tuzatish — yozishni hammaga (anon + authenticated) ochadi.
-- Bu faylni Supabase → SQL Editor da bir marta ishga tushiring.
-- Ma'lumotlarni O'CHIRMAYDI — faqat insert/update siyosatlarini yangilaydi.
-- (schema.sql allaqachon ishga tushirilgan bo'lsa, sharh/narx qo'shishdagi
--  "row-level security policy" xatosini bartaraf etadi.)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'businesses', 'products', 'price_entries', 'reviews',
    'review_replies', 'ad_analysis', 'claim_registry',
    'price_alerts', 'market_index'
  ]
  loop
    execute format('drop policy if exists "%s_insert" on public.%I;', t, t);
    execute format('drop policy if exists "%s_update" on public.%I;', t, t);
    execute format('create policy "%s_insert" on public.%I for insert with check (true);', t, t);
    execute format('create policy "%s_update" on public.%I for update using (true) with check (true);', t, t);
  end loop;
end $$;
