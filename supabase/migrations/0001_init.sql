-- ViralForge — schéma initial
-- À exécuter une fois : Supabase Dashboard → SQL Editor, ou `supabase db push`.
--
-- Modèle de sécurité :
--   * Le navigateur ne peut que LIRE son profil et son solde (RLS).
--   * `plan` et `balance` ne sont modifiés que côté serveur, avec la clé
--     service_role (route /api/generate et webhook de paiement).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  billing_provider text,
  billing_customer_id text,
  billing_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credits (
  user_id uuid primary key references public.users (id) on delete cascade,
  balance integer not null default 3 check (balance >= 0),
  lifetime_used integer not null default 0 check (lifetime_used >= 0),
  updated_at timestamptz not null default now()
);

create table public.saved_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tool text not null check (tool in ('clone', 'antidropoff', 'series')),
  title text not null check (char_length(title) between 1 and 200),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

create index saved_scripts_user_created_idx
  on public.saved_scripts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.credits enable row level security;
alter table public.saved_scripts enable row level security;

create policy "users: lecture de son profil"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);

create policy "credits: lecture de son solde"
  on public.credits for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_scripts: lecture"
  on public.saved_scripts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_scripts: création"
  on public.saved_scripts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "saved_scripts: suppression"
  on public.saved_scripts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Droits explicites (ne dépend pas des privilèges par défaut du projet).
revoke all on public.users, public.credits, public.saved_scripts from anon, authenticated;
grant select on public.users to authenticated;
grant select on public.credits to authenticated;
grant select, insert, delete on public.saved_scripts to authenticated;
grant all on public.users, public.credits, public.saved_scripts to service_role;

-- ---------------------------------------------------------------------------
-- Création automatique du profil + 3 crédits offerts à l'inscription
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.credits (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
     set email = coalesce(new.email, ''), updated_at = now()
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Crédits : opérations atomiques, réservées au serveur (service_role)
-- ---------------------------------------------------------------------------

-- Décrémente d'un crédit. Renvoie le nouveau solde, ou NULL si le solde est à 0.
create or replace function public.consume_credit(p_user_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.credits
     set balance = balance - 1,
         lifetime_used = lifetime_used + 1,
         updated_at = now()
   where user_id = p_user_id
     and balance > 0
  returning balance;
$$;

-- Rend un crédit quand la génération a échoué. Renvoie le nouveau solde.
create or replace function public.refund_credit(p_user_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.credits
     set balance = balance + 1,
         lifetime_used = greatest(lifetime_used - 1, 0),
         updated_at = now()
   where user_id = p_user_id
  returning balance;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
revoke all on function public.consume_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid) to service_role;
grant execute on function public.refund_credit(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Rattrapage : comptes créés avant l'exécution de cette migration
-- ---------------------------------------------------------------------------

insert into public.users (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;

insert into public.credits (user_id)
select id from public.users
on conflict (user_id) do nothing;
