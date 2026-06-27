-- ============================================================================
-- "Haqiqat tarixi" — joyning vaqt bo'yicha holati (foto + xarita yozuvlari)
-- ----------------------------------------------------------------------------
-- Supabase → SQL Editor da bir marta ishga tushiring.
-- ============================================================================

create table if not exists public.place_history (
  id               bigint generated always as identity primary key,
  "businessId"     bigint not null,
  kind             text not null check (kind in ('photo', 'map')),
  source           text,                       -- user | google | yandex
  label            text,                       -- yotoqxona, hojatxona, umumiy ...
  url              text,                       -- rasm URL (kind = photo)
  "conditionScore" integer,                    -- 0-100 holat bahosi (tozalik/yangilik)
  note             text,                       -- AI izoh
  "capturedAt"     timestamptz not null default now()
);

create index if not exists place_history_business_idx
  on public.place_history ("businessId", "capturedAt" desc);

alter table public.place_history enable row level security;

drop policy if exists "place_history_read"   on public.place_history;
drop policy if exists "place_history_insert" on public.place_history;
create policy "place_history_read"   on public.place_history for select using (true);
create policy "place_history_insert" on public.place_history for insert with check (true);
