-- ViralForge — débit de crédit sans clé secrète
-- À exécuter une fois, après 0002 (Supabase Dashboard → SQL Editor).
--
-- Permet au serveur de débiter un crédit avec la session de l'utilisateur,
-- quand SUPABASE_SERVICE_ROLE_KEY n'est pas configurée. La fonction ne peut
-- que DIMINUER le solde de l'utilisateur connecté : l'appeler soi-même depuis
-- le navigateur ne fait donc que dépenser ses propres crédits.

-- Débit atomique d'un crédit. Renvoie le nouveau solde, ou NULL si le solde
-- est déjà à 0 (ou si personne n'est connecté).
create or replace function public.spend_own_credit()
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.credits
     set balance = balance - 1,
         lifetime_used = lifetime_used + 1,
         updated_at = now()
   where user_id = (select auth.uid())
     and balance > 0
  returning balance;
$$;

revoke all on function public.spend_own_credit() from public, anon;
grant execute on function public.spend_own_credit() to authenticated;
