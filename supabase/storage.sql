-- ============================================================================
-- Biznes rasmlari uchun Supabase Storage + businesses.photos ustuni
-- ----------------------------------------------------------------------------
-- Supabase → SQL Editor da bir marta ishga tushiring.
-- (schema.sql allaqachon ishlatilgan bo'lsa — bu faylни qo'shimcha ishga tushiring.)
-- ============================================================================

-- 1) Ommaviy bucket
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

-- 2) Storage siyosatlari (ochiq o'qish + ochiq yuklash)
drop policy if exists "business_photos_read"   on storage.objects;
drop policy if exists "business_photos_insert" on storage.objects;

create policy "business_photos_read" on storage.objects
  for select using (bucket_id = 'business-photos');

create policy "business_photos_insert" on storage.objects
  for insert with check (bucket_id = 'business-photos');

-- 3) businesses jadvaliga rasm ro'yxati uchun ustun
alter table public.businesses
  add column if not exists photos jsonb not null default '[]'::jsonb;
