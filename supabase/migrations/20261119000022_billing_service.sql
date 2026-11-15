-- Swipo — l'état des abonnements est écrit par le serveur avec sa clé secrète Supabase (rôle service_role).
-- Plus besoin de recopier l'empreinte du secret Stripe dans la base quand on change de compte Stripe
-- (passage du mode test au mode réel). L'ancien contrôle par empreinte reste accepté pendant la transition.

create or replace function public.billing_update(
  p_secret text, p_company uuid, p_customer text default null, p_subscription text default null,
  p_status text default null, p_plan text default null, p_interval text default null,
  p_period_end timestamptz default null, p_cancel boolean default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_expected text; v_company uuid; v_role text;
begin
  v_role := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                     (nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'role');
  if v_role is distinct from 'service_role' then
    select value into v_expected from private.settings where key = 'stripe_webhook_secret_sha256';
    if v_expected is null or p_secret is null or public._token_hash(p_secret) <> v_expected then
      raise exception 'Refusé' using errcode = '42501';
    end if;
  end if;
  v_company := coalesce(p_company, (select id from public.companies where stripe_customer_id = p_customer limit 1));
  if v_company is null then raise exception 'Entreprise introuvable' using errcode = 'P0002'; end if;
  update public.companies set
    stripe_customer_id = coalesce(p_customer, stripe_customer_id),
    stripe_subscription_id = case when p_subscription is null then stripe_subscription_id else nullif(p_subscription, '') end,
    subscription_status = coalesce(p_status, subscription_status),
    plan = coalesce(p_plan, plan),
    billing_interval = coalesce(p_interval, billing_interval),
    current_period_end = coalesce(p_period_end, current_period_end),
    cancel_at_period_end = coalesce(p_cancel, cancel_at_period_end)
  where id = v_company;
  return v_company;
end $$;
grant execute on function public.billing_update(text, uuid, text, text, text, text, text, timestamptz, boolean) to service_role;
