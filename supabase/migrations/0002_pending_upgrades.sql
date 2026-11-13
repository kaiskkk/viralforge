-- ViralForge — plans Pro en attente
-- À exécuter une fois, après 0001_init.sql (Supabase Dashboard → SQL Editor).
--
-- Un visiteur peut payer avant d'avoir créé son compte. Le webhook de paiement
-- range alors son plan Pro ici, sous l'e-mail utilisé au paiement, et le compte
-- le récupère à sa création.

create table if not exists public.pending_upgrades (
  email text primary key,
  billing_provider text not null,
  billing_customer_id text,
  billing_subscription_id text,
  created_at timestamptz not null default now()
);

-- Aucune règle RLS : la table n'est accessible qu'au serveur (service_role).
alter table public.pending_upgrades enable row level security;
revoke all on public.pending_upgrades from anon, authenticated;
grant all on public.pending_upgrades to service_role;

-- Remplace le trigger d'inscription : profil + 3 crédits, puis plan Pro en
-- attente s'il y en a un pour cet e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending public.pending_upgrades%rowtype;
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.credits (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  delete from public.pending_upgrades
   where email = lower(coalesce(new.email, ''))
  returning * into pending;

  if found then
    update public.users
       set plan = 'pro',
           billing_provider = pending.billing_provider,
           billing_customer_id = pending.billing_customer_id,
           billing_subscription_id = pending.billing_subscription_id,
           updated_at = now()
     where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
