-- ViralForge — paiements Whop traités par la base de données
-- À exécuter une fois, après 0003 (Supabase Dashboard → SQL Editor).
--
-- Le webhook Whop (/api/webhooks/whop) transmet chaque notification telle
-- quelle à handle_whop_webhook. La fonction vérifie la signature avec le
-- secret du webhook, rangé dans app_secrets, puis passe le compte en "pro" ou
-- le repasse en "free". Le site n'a donc besoin ni de la clé secrète Supabase
-- ni du secret Whop dans ses variables d'environnement.
--
-- Pour enregistrer le secret (commence par ws_) :
--   insert into public.app_secrets (name, value)
--   values ('whop_webhook_secret', 'ws_…')
--   on conflict (name) do update set value = excluded.value, updated_at = now();

create extension if not exists pgcrypto with schema extensions;

-- Secrets du site. Aucune règle RLS ni aucun droit : illisible depuis l'API.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
grant all on public.app_secrets to service_role;

-- Statuts renvoyés : not_configured, invalid_signature, invalid_body, ignored, ok.
create or replace function public.handle_whop_webhook(
  p_webhook_id text,
  p_timestamp text,
  p_signatures text,
  p_body text,
  p_plan_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_sent_at numeric;
  v_expected text;
  v_entry text;
  v_valid boolean := false;
  v_payload jsonb;
  v_type text;
  v_data jsonb;
  v_plan text;
  v_email text;
  v_customer text;
  v_membership text;
  v_count integer;
begin
  select value into v_secret from public.app_secrets where name = 'whop_webhook_secret';
  if v_secret is null then
    return jsonb_build_object('status', 'not_configured');
  end if;

  -- Standard Webhooks : HMAC-SHA256 de "id.timestamp.corps", en base64, avec
  -- le secret ws_… utilisé tel quel comme clé. Message de plus de 5 minutes
  -- (ou daté du futur) : rejeu, refusé.
  if p_webhook_id is null or p_timestamp is null or p_signatures is null
     or p_timestamp !~ '^[0-9]{1,12}$' then
    return jsonb_build_object('status', 'invalid_signature');
  end if;
  v_sent_at := p_timestamp::numeric;
  if abs(extract(epoch from now()) - v_sent_at) > 300 then
    return jsonb_build_object('status', 'invalid_signature');
  end if;

  v_expected := encode(
    extensions.hmac(
      convert_to(p_webhook_id || '.' || p_timestamp || '.' || coalesce(p_body, ''), 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'base64'
  );
  -- Comparaison des empreintes plutôt que des signatures : son temps ne
  -- dépend pas du nombre de caractères corrects.
  foreach v_entry in array string_to_array(p_signatures, ' ') loop
    if split_part(v_entry, ',', 1) = 'v1'
       and extensions.digest(split_part(v_entry, ',', 2), 'sha256')
           = extensions.digest(v_expected, 'sha256') then
      v_valid := true;
    end if;
  end loop;
  if not v_valid then
    return jsonb_build_object('status', 'invalid_signature');
  end if;

  begin
    v_payload := p_body::jsonb;
  exception when others then
    return jsonb_build_object('status', 'invalid_body');
  end;
  v_type := v_payload ->> 'type';
  v_data := v_payload -> 'data';
  if v_type is null or jsonb_typeof(v_data) is distinct from 'object' then
    return jsonb_build_object('status', 'invalid_body');
  end if;
  if v_type not in ('payment.succeeded', 'membership.activated', 'membership.deactivated') then
    return jsonb_build_object('status', 'ignored', 'reason', v_type);
  end if;

  -- Le compte Whop peut vendre autre chose : seul le plan du site compte.
  v_plan := coalesce(v_data ->> 'variant_id', v_data -> 'plan' ->> 'id');
  if p_plan_id is not null and v_plan is not null and v_plan <> p_plan_id then
    return jsonb_build_object('status', 'ignored', 'reason', 'other_plan');
  end if;

  -- Deux formes selon la version de l'API : à plat ou imbriquée.
  -- Supabase Auth stocke les e-mails en minuscules.
  v_email := nullif(lower(trim(coalesce(v_data ->> 'customer_email', v_data -> 'user' ->> 'email'))), '');
  v_customer := coalesce(v_data ->> 'user_id', v_data -> 'user' ->> 'id');
  v_membership := case
    when v_type like 'membership.%' then v_data ->> 'id'
    else coalesce(v_data ->> 'membership_id', v_data -> 'membership' ->> 'id')
  end;

  -- Paiement ou abonnement actif : passage en Pro.
  if v_type <> 'membership.deactivated' then
    if v_email is not null then
      update public.users
         set plan = 'pro',
             billing_provider = 'whop',
             billing_customer_id = v_customer,
             billing_subscription_id = v_membership,
             updated_at = now()
       where email = v_email;
      get diagnostics v_count = row_count;
      if v_count > 0 then
        return jsonb_build_object('status', 'ok', 'matched', true, 'plan', 'pro');
      end if;
    end if;

    -- Notification sans e-mail : le compte a pu être relié par une précédente.
    if v_membership is not null then
      update public.users
         set plan = 'pro', updated_at = now()
       where billing_provider = 'whop' and billing_subscription_id = v_membership;
      get diagnostics v_count = row_count;
      if v_count > 0 then
        return jsonb_build_object('status', 'ok', 'matched', true, 'plan', 'pro');
      end if;
    end if;

    -- Paiement avant inscription : le plan attend la création du compte.
    if v_email is not null then
      insert into public.pending_upgrades (email, billing_provider, billing_customer_id, billing_subscription_id)
      values (v_email, 'whop', v_customer, v_membership)
      on conflict (email) do update
        set billing_provider = excluded.billing_provider,
            billing_customer_id = excluded.billing_customer_id,
            billing_subscription_id = excluded.billing_subscription_id;
      return jsonb_build_object('status', 'ok', 'matched', false, 'plan', 'pro', 'pending', true);
    end if;

    return jsonb_build_object('status', 'ok', 'matched', false, 'plan', 'pro');
  end if;

  -- Fin d'abonnement : retour en gratuit.
  if v_membership is not null then
    -- Un plan encore en attente pour cet abonnement n'a plus lieu d'être.
    delete from public.pending_upgrades where billing_subscription_id = v_membership;

    update public.users
       set plan = 'free', updated_at = now()
     where billing_provider = 'whop' and billing_subscription_id = v_membership;
    get diagnostics v_count = row_count;
    if v_count > 0 then
      return jsonb_build_object('status', 'ok', 'matched', true, 'plan', 'free');
    end if;
  end if;

  -- Compte activé par un paiement sans abonnement connu : repli sur le client Whop.
  if v_customer is not null then
    update public.users
       set plan = 'free', updated_at = now()
     where billing_provider = 'whop'
       and billing_customer_id = v_customer
       and billing_subscription_id is null;
    get diagnostics v_count = row_count;
    if v_count > 0 then
      return jsonb_build_object('status', 'ok', 'matched', true, 'plan', 'free');
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'matched', false, 'plan', 'free');
end;
$$;

-- Appelable sans session : la signature Whop tient lieu d'authentification.
revoke all on function public.handle_whop_webhook(text, text, text, text, text) from public;
grant execute on function public.handle_whop_webhook(text, text, text, text, text) to anon, authenticated, service_role;
