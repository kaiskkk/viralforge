-- ViralForge — Journal de performance
-- À exécuter une fois, après 0006 (Supabase Dashboard → SQL Editor).
--
-- Le créateur note les vraies statistiques de ses vidéos publiées ; le site en
-- tire ce qui marche pour lui. Plan gratuit : 5 vidéos. Pro : illimité.

create table if not exists public.video_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  platform text not null check (platform in ('tiktok', 'reels', 'shorts', 'other')),
  hook text not null default '' check (char_length(hook) <= 300),
  published_on date not null default current_date,
  duration_seconds integer check (duration_seconds between 1 and 3600),
  views integer not null check (views between 0 and 2000000000),
  likes integer check (likes between 0 and 2000000000),
  comments integer check (comments between 0 and 2000000000),
  avg_watch_pct numeric(5, 2) check (avg_watch_pct between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists video_logs_user_idx on public.video_logs (user_id, published_on desc);

-- Nombre de vidéos du journal en plan gratuit.
create or replace function public.video_log_limit()
returns integer
language sql
immutable
set search_path = ''
as $$ select 5 $$;

-- Vrai si l'utilisateur connecté peut ajouter une vidéo : Pro, ou sous la limite.
-- security definer : lit users et compte ses lignes sans dépendre des règles RLS.
create or replace function public.can_add_video_log()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.plan = 'pro' from public.users u where u.id = (select auth.uid())), false)
      or (select count(*) from public.video_logs v where v.user_id = (select auth.uid()))
         < public.video_log_limit();
$$;

revoke all on function public.can_add_video_log() from public, anon;
grant execute on function public.can_add_video_log() to authenticated;
grant execute on function public.video_log_limit() to anon, authenticated;

alter table public.video_logs enable row level security;

drop policy if exists "video_logs: lecture" on public.video_logs;
create policy "video_logs: lecture"
  on public.video_logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "video_logs: création" on public.video_logs;
create policy "video_logs: création"
  on public.video_logs for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_add_video_log());

drop policy if exists "video_logs: modification" on public.video_logs;
create policy "video_logs: modification"
  on public.video_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "video_logs: suppression" on public.video_logs;
create policy "video_logs: suppression"
  on public.video_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.video_logs from anon, authenticated;
grant select, insert, update, delete on public.video_logs to authenticated;
grant all on public.video_logs to service_role;
