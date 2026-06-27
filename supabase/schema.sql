-- ============================================================================
-- Sayyoh AI — Supabase schema + seed data
-- ----------------------------------------------------------------------------
-- Supabase Dashboard → SQL Editor → New query → bu faylni to'liq joylashtiring
-- → "Run" tugmasini bosing. Bir marta ishga tushirish kifoya.
--
-- Eslatma: ustun nomlari camelCase ("trustScore", "createdAt" ...) — frontend
-- shu nomlarni kutadi, shuning uchun ular qo'shtirnoq ichida saqlanadi.
-- ============================================================================

-- Toza o'rnatish uchun eski jadvallarni o'chiramiz (qayta ishga tushirish xavfsiz)
drop table if exists public.price_alerts   cascade;
drop table if exists public.claim_registry cascade;
drop table if exists public.ad_analysis    cascade;
drop table if exists public.review_replies cascade;
drop table if exists public.reviews        cascade;
drop table if exists public.price_entries  cascade;
drop table if exists public.products       cascade;
drop table if exists public.market_index   cascade;
drop table if exists public.businesses     cascade;
drop table if exists public.profiles       cascade;

-- ============================================================================
-- PROFILES (Supabase Auth bilan bog'lanadi)
-- ============================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  "createdAt" timestamptz not null default now()
);

-- Yangi foydalanuvchi ro'yxatdan o'tganda avtomatik profil yaratish
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- BUSINESSES
-- ============================================================================
create table public.businesses (
  id              bigint generated always as identity primary key,
  "ownerId"       bigint,
  name            text not null,
  type            text not null default 'market' check (type in ('market', 'tourism', 'service')),
  category        text,
  region          text,
  lat             numeric(10,7),
  lng             numeric(10,7),
  "googlePlaceId" text,
  "yandexId"      text,
  description     text,
  claimed         boolean default false,
  "trustScore"    integer default 0,
  "adRating"      numeric(3,1),
  "realRating"    numeric(3,1),
  photos          jsonb not null default '[]'::jsonb,
  "createdAt"     timestamptz not null default now()
);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table public.products (
  id           bigint generated always as identity primary key,
  "businessId" bigint,
  name         text not null,
  category     text,
  unit         text,
  "createdAt"  timestamptz not null default now()
);

-- ============================================================================
-- PRICE ENTRIES (vaqt qatori)
-- ============================================================================
create table public.price_entries (
  id           bigint generated always as identity primary key,
  "productId"  bigint not null,
  "businessId" bigint,
  price        numeric(12,2) not null,
  unit         text,
  source       text not null default 'web' check (source in ('bot', 'web', 'admin')),
  "createdAt"  timestamptz not null default now()
);

-- ============================================================================
-- REVIEWS
-- ============================================================================
create table public.reviews (
  id                    bigint generated always as identity primary key,
  "businessId"          bigint not null,
  "authorId"            bigint,
  rating                integer not null,
  text                  text,
  "imageUrl"            text,
  "isVerified"          boolean default false,
  "aiAuthenticityScore" integer,
  "aiFlag"              text check ("aiFlag" in ('genuine', 'suspicious', 'fake')),
  "aiReason"            text,
  status                text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source                text default 'internal' check (source in ('internal', 'google', 'yandex')),
  "createdAt"           timestamptz not null default now()
);

-- ============================================================================
-- REVIEW REPLIES
-- ============================================================================
create table public.review_replies (
  id          bigint generated always as identity primary key,
  "reviewId"  bigint not null,
  "aiDraft"   text,
  "finalText" text,
  published   boolean default false,
  "createdAt" timestamptz not null default now()
);

-- ============================================================================
-- AD ANALYSIS
-- ============================================================================
create table public.ad_analysis (
  id                  bigint generated always as identity primary key,
  "submittedBy"       bigint,
  "businessId"        bigint,
  "sourceType"        text not null check ("sourceType" in ('instagram_video', 'telegram_post', 'telegram_channel', 'image')),
  "mediaUrl"          text,
  "sourceLink"        text,
  "extractedClaims"   jsonb,
  "honestyScore"      integer,
  mismatches          jsonb,
  "manipulationFlags" jsonb,
  "aiSummary"         text,
  "createdAt"         timestamptz not null default now()
);

-- ============================================================================
-- CLAIM REGISTRY
-- ============================================================================
create table public.claim_registry (
  id               bigint generated always as identity primary key,
  "businessId"     bigint not null,
  claim            text not null,
  "confirmedCount" integer default 0,
  "deniedCount"    integer default 0
);

-- ============================================================================
-- PRICE ALERTS
-- ============================================================================
create table public.price_alerts (
  id            bigint generated always as identity primary key,
  "userId"      bigint not null,
  "productId"   bigint not null,
  "targetPrice" numeric(12,2) not null,
  active        boolean default true
);

-- ============================================================================
-- MARKET INDEX
-- ============================================================================
create table public.market_index (
  id           bigint generated always as identity primary key,
  category     text not null,
  region       text,
  "avgPrice"   numeric(12,2) not null,
  period       text,
  "computedAt" timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- O'qish va yozish — hammaga ochiq (anon + authenticated). Ilova narx/sharh
-- qo'shishni ochiq harakat sifatida ko'radi (login majburiy emas).
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.businesses     enable row level security;
alter table public.products       enable row level security;
alter table public.price_entries  enable row level security;
alter table public.reviews        enable row level security;
alter table public.review_replies enable row level security;
alter table public.ad_analysis    enable row level security;
alter table public.claim_registry enable row level security;
alter table public.price_alerts   enable row level security;
alter table public.market_index   enable row level security;

-- Profiles: har kim ko'ra oladi, foydalanuvchi faqat o'zinikini tahrirlaydi
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Ma'lumot jadvallari uchun umumiy siyosat (public read + authenticated write)
do $$
declare t text;
begin
  foreach t in array array[
    'businesses', 'products', 'price_entries', 'reviews',
    'review_replies', 'ad_analysis', 'claim_registry',
    'price_alerts', 'market_index'
  ]
  loop
    execute format('create policy "%s_read"   on public.%I for select using (true);', t, t);
    execute format('create policy "%s_insert" on public.%I for insert with check (true);', t, t);
    execute format('create policy "%s_update" on public.%I for update using (true) with check (true);', t, t);
  end loop;
end $$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- ─── Businesses (id 1..10) ───
insert into public.businesses (name, type, category, region, lat, lng, description, "trustScore", "adRating", "realRating") values
  ('Sirdaryo Bozor',     'market',  'Dehqon Bozori',     'Sirdaryo',  40.84, 68.68, 'Asosiy mahalliy dehqon bozori. Yangi mahsulotlar har kuni.', 78, 4.5, 3.8),
  ('Guliston Markazi',   'market',  'Savdo Markazi',     'Sirdaryo',  40.49, 68.78, 'Zamonaviy savdo markazi. 200+ do''kon.',                     85, 4.8, 4.2),
  ('Chorvador Go''sht',  'market',  'Go''sht Mahsulotlari','Sirdaryo', 40.50, 68.76, 'Sifatli mol va qo''y go''shti. Halol sertifikati.',          92, 4.2, 4.5),
  ('Toshkent Mevalar',   'market',  'Meva-Sabzavot',     'Toshkent',  41.30, 69.24, 'Yangi meva va sabzavot yetkazib berish.',                    71, 4.9, 3.5),
  ('Zomin Tog''lari',    'tourism', 'Dam Olish',         'Jizzax',    39.96, 68.36, 'Tabiiy go''zallik, toza havo, ekoturizm.',                   88, 4.7, 4.4),
  ('Charvak Suv Ombori', 'tourism', 'Dam Olish',         'Toshkent',  41.63, 70.03, 'Suv sporti, qayiq sayrati, dam olish.',                      82, 4.6, 4.0),
  ('Xiva Ichan Qala',    'tourism', 'Tarixiy Joy',       'Xorazm',    41.38, 60.36, 'UNESCO merosi. Tarixiy me''morlik.',                         95, 4.9, 4.8),
  ('Navoiy Karvon',      'service', 'Yetkazib Berish',   'Navoiy',    40.10, 65.37, 'Tez va ishonchli yetkazib berish xizmati.',                  67, 4.8, 3.2),
  ('Samarkand Oshxona',  'service', 'Restoran',          'Samarqand', 39.65, 66.96, 'An''anaviy osh va kabob. Milliy taomlar.',                   90, 4.5, 4.6),
  ('Buxoro Gilam',       'market',  'Qo''lda Toshlangan','Buxoro',    39.77, 64.42, 'An''anaviy buxoro gilamlari. Qo''lda toshlangan.',           87, 4.3, 4.4);

-- ─── Products (id 1..15) ───
insert into public.products ("businessId", name, category, unit) values
  (1, 'Piyoz',             'Sabzavot',         'kg'),
  (1, 'Sabzi',             'Sabzavot',         'kg'),
  (1, 'Kartoshka',         'Sabzavot',         'kg'),
  (1, 'Pomidor',           'Sabzavot',         'kg'),
  (2, 'Guruch (Devzira)',  'Don Mahsulotlari', 'kg'),
  (2, 'Yog'' (Sovuq Qisma)','Yog'' Mahsulotlari','litr'),
  (3, 'Mol Go''shti',      'Go''sht',          'kg'),
  (3, 'Qo''y Go''shti',    'Go''sht',          'kg'),
  (3, 'Tovuq Go''shti',    'Go''sht',          'kg'),
  (4, 'Olma',              'Meva',             'kg'),
  (4, 'Uzum',              'Meva',             'kg'),
  (4, 'Anor',              'Meva',             'kg'),
  (6, 'Charvak Turi',      'Tur Xizmati',      'kishi'),
  (9, 'Osh (1 kishilik)',  'Taom',             'pors'),
  (9, 'Kabob (Set)',       'Taom',             'set');

-- ─── Price Entries (oxirgi 30 kunlik vaqt qatori) ───
insert into public.price_entries ("productId", "businessId", price, unit, source, "createdAt")
select 1, 1, round(3500 + sin(i * 0.3) * 800 + random() * 400),   'kg', 'web', now() - ((30 - i) || ' days')::interval from generate_series(0, 29) as i;
insert into public.price_entries ("productId", "businessId", price, unit, source, "createdAt")
select 7, 3, round(85000 + sin(i * 0.2) * 5000 + random() * 3000), 'kg', 'web', now() - ((30 - i) || ' days')::interval from generate_series(0, 29) as i;
insert into public.price_entries ("productId", "businessId", price, unit, source, "createdAt")
select 5, 2, round(18000 + cos(i * 0.25) * 2000 + random() * 1000),'kg', 'web', now() - ((30 - i) || ' days')::interval from generate_series(0, 29) as i;
insert into public.price_entries ("productId", "businessId", price, unit, source, "createdAt")
select 10, 4, round(12000 + sin(i * 0.4) * 3000 + random() * 1500),'kg', 'web', now() - ((30 - i) || ' days')::interval from generate_series(0, 29) as i;

-- ─── Reviews ───
insert into public.reviews ("businessId", rating, text, "isVerified", "aiAuthenticityScore", "aiFlag", "aiReason", status) values
  (1, 5, 'Juda yaxshi bozor. Narxlar arzon va sifatli mahsulotlar. Har hafta boraman.',        true,  95, 'genuine',    'Tabiiy til, konkret tajriba',           'approved'),
  (1, 4, 'Piyoz va sabzilar yangi. Bozorchilar do''stona. Faqat parking muammo.',              true,  92, 'genuine',    'Haqiqiy foydalanuvchi tajribasi',       'approved'),
  (1, 3, 'Narxlar o''rtacha. Ba''zi sotuvchilar og''irlikni to''g''ri qilmaydi.',              false, 88, 'genuine',    'Tanqidiy ammo asosli',                  'approved'),
  (1, 5, 'Eng zo''r bozor! Hammaga tavsiya qilaman! 100% ishonchli!',                          false, 35, 'suspicious', 'Umumiy iboralar, konkret ma''lumot yo''q','approved'),
  (5, 5, 'Zomin tog''lari ajoyib! Tabiiy havo va go''zal manzaralar. Eko-kulublar zo''r.',     true,  96, 'genuine',    'Batafsil tavsif, hissiyotlar',          'approved'),
  (5, 2, 'Reklamada ko''rganimdek emas. Yo''l yomon, xizmat past darajada.',                   true,  89, 'genuine',    'Haqiqiy tanqid, konkret muammolar',     'approved'),
  (5, 5, 'Ajoyib joy!!! Hammaga tavsiya qilaman!!! Kelib ko''ringlar!!!',                      false, 28, 'fake',       'Spam xususiyatlari, noyozlik',          'approved'),
  (9, 5, 'Samarkand oshi ajoyib ta''mga ega. Noni juda yoqimli. Kelib ta''til qildik.',        true,  94, 'genuine',    'Maxsus ta''riflar, batafsil',           'approved'),
  (9, 4, 'Kaboblari mazali. Narxlar biroz qimmat lekin sifatga arziydi.',                      true,  91, 'genuine',    'Narx-sifat tahlili',                    'approved'),
  (8, 2, 'Buyurtma 5 kunda emas, 15 kunda yetdi. Mijozlarga javob bermaydilar.',               true,  93, 'genuine',    'Konkret shikoyat, vaqt/reaktsiya',      'approved'),
  (8, 5, 'Zo''r xizmat! Tez yetkazib berish! Juda mamnunman!',                                 false, 32, 'suspicious', 'Umumiy superlativlar, kam batafsil',    'approved'),
  (6, 4, 'Suv ombori go''zal. Qayiq sayrati yoqimli. Ammo dam olish zonasi eskirgan.',         true,  90, 'genuine',    'Balansli baho, ijobiy-salbiy',          'approved'),
  (6, 1, 'Toza plyaj deb reklama qilganlar, aslida iflos. Chiqindilar tozalanmagan.',          true,  87, 'genuine',    'Reklama-haqiqat tafovuti',              'approved'),
  (7, 5, 'Buyuk tarix! Minoralar va madrasalar hayratlanarli. Gid juda bilimli edi.',          true,  97, 'genuine',    'Madaniy tajriba, batafsil',             'approved'),
  (7, 5, 'UNESCO merosini ko''rish sharafiga ega bo''ldik. Kechqurun chiroqlar go''zal.',      true,  95, 'genuine',    'Voqealar tavsifi, vaqt belgisi',        'approved');

-- ─── Ad Analysis ───
insert into public.ad_analysis ("sourceType", "mediaUrl", "sourceLink", "honestyScore", "extractedClaims", mismatches, "manipulationFlags", "aiSummary") values
  ('instagram_video', 'https://sample-videos.com/instagram/ad1.mp4', null, 35,
    '["Toza plyaj", "Eng arzon narxlar", "Bepul transfer"]'::jsonb,
    '[{"claim":"Toza plyaj","reality":"15 ta sharhda ''iflos'' so''zi qayd etilgan","evidence":"Sharhlar tahlili"},{"claim":"Eng arzon narxlar","reality":"Bozor narxidan 40% qimmat","evidence":"Narx taqqoslash"},{"claim":"Bepul transfer","reality":"Transfer xizmati yashirin to''lov bilan","evidence":"Shartnoma tahlili"}]'::jsonb,
    '["stock_footage", "wrong_location"]'::jsonb,
    'Reklama 65% haqiqatga zidd. Stock videolar ishlatilgan, joy noto''g''ri ko''rsatilgan.'),
  ('telegram_post', null, 'https://t.me/examplechannel/123', 72,
    '["Yangi ochilish", "Chegirmalar 50% gacha"]'::jsonb,
    '[{"claim":"50% chegirma","reality":"Faqat 2 ta mahsulotga 50%, qolganlari 10%","evidence":"Shartlar o''rganildi"}]'::jsonb,
    '["misleading_discount"]'::jsonb,
    'Reklama asosan haqiqatga mos, ammo chegirma shartlari aniq emas.'),
  ('image', 'https://example.com/ad-poster.jpg', null, 15,
    '["5 yulduzli mehmonxona", "Bepul nonushta", "Hamma qulayliklar"]'::jsonb,
    '[{"claim":"5 yulduzli","reality":"3 yulduzli mehmonxona","evidence":"Rasmiy ro''yxat"},{"claim":"Bepul nonushta","reality":"Nonushta narxi $15","evidence":"Narxlar ro''yxati"}]'::jsonb,
    '["ai_generated", "false_claims"]'::jsonb,
    'Reklama 85% yolg''on. Mehmonxona darajasi noto''g''ri, xizmatlar haqiqatga mos emas.');

-- ─── Claim Registry ───
insert into public.claim_registry ("businessId", claim, "confirmedCount", "deniedCount") values
  (5, 'Tabiiy dam olish joyi',        45, 3),
  (5, 'Toza havo va go''zal manzara', 52, 1),
  (1, 'Yangi mahsulotlar',            38, 7),
  (3, 'Halol sertifikatli go''sht',   41, 2),
  (6, 'Toza suv',                     25, 15);

-- ─── Market Index ───
insert into public.market_index (category, region, "avgPrice", period) values
  ('Sabzavot',         'Sirdaryo',  4500,   'daily'),
  ('Go''sht',          'Sirdaryo',  82000,  'daily'),
  ('Don Mahsulotlari', 'Toshkent',  19500,  'daily'),
  ('Meva',             'Toshkent',  13500,  'daily'),
  ('Sabzavot',         'Toshkent',  5200,   'daily'),
  ('Go''sht',          'Samarqand', 79000,  'daily'),
  ('Tourism',          'Jizzax',    150000, 'daily'),
  ('Tourism',          'Toshkent',  250000, 'daily');

-- ============================================================================
-- TAYYOR! Endi app/.env faylига Supabase URL va anon key qo'shing.
-- ============================================================================
