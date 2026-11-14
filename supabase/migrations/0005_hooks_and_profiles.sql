-- ViralForge — Labo à hooks et profil créateur
-- À exécuter une fois, après 0004 (Supabase Dashboard → SQL Editor).

-- Les scripts sauvegardés acceptent le nouvel outil « hooks ».
alter table public.saved_scripts drop constraint if exists saved_scripts_tool_check;
alter table public.saved_scripts
  add constraint saved_scripts_tool_check
  check (tool in ('clone', 'antidropoff', 'series', 'hooks'));

-- Profil créateur : niche, audience, ton, plateforme et style, injectés dans
-- les prompts de tous les outils.
create table if not exists public.creator_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  niche text not null default '' check (char_length(niche) <= 120),
  audience text not null default '' check (char_length(audience) <= 200),
  tone text not null default '' check (char_length(tone) <= 40),
  platform text not null default '' check (char_length(platform) <= 40),
  style_notes text not null default '' check (char_length(style_notes) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.creator_profiles enable row level security;

drop policy if exists "creator_profiles: lecture" on public.creator_profiles;
create policy "creator_profiles: lecture"
  on public.creator_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "creator_profiles: création" on public.creator_profiles;
create policy "creator_profiles: création"
  on public.creator_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "creator_profiles: modification" on public.creator_profiles;
create policy "creator_profiles: modification"
  on public.creator_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.creator_profiles from anon, authenticated;
grant select, insert, update on public.creator_profiles to authenticated;
grant all on public.creator_profiles to service_role;
