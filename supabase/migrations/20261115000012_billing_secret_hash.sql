-- Swipo — la base ne garde que l'empreinte (SHA-256) du secret du serveur, jamais le secret lui-même.
create or replace function public.billing_update(
  p_secret text, p_company uuid, p_customer text default null, p_subscription text default null,
  p_status text default null, p_plan text default null, p_interval text default null,
  p_period_end timestamptz default null, p_cancel boolean default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_expected text; v_company uuid;
begin
  select value into v_expected from private.settings where key = 'stripe_webhook_secret_sha256';
  if v_expected is null or p_secret is null or public._token_hash(p_secret) <> v_expected then
    raise exception 'Refusé' using errcode = '42501';
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
