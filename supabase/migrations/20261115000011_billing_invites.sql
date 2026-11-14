-- Swipo — lot 7 : abonnement (essai, offres, pilotes, Stripe) et liens d'invitation des agents.

-- ---------------------------------------------------------------------------
-- 1. Liens d'invitation : le gérant envoie un lien, l'agent l'ouvre et il est connecté.
--    Seule l'empreinte du lien est gardée ; il sert une fois et expire après 7 jours.
-- ---------------------------------------------------------------------------
alter table public.members add column invite_hash text, add column invite_expires_at timestamptz;
create unique index members_invite_hash on public.members (invite_hash) where invite_hash is not null;

create or replace function public._token_hash(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;

create or replace function public.create_invite_link(p_member uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.members; v_token text;
begin
  select * into m from public.members where id = p_member;
  if not found or not public.has_role(m.company_id, 'gerant') then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  if not m.active then raise exception 'Ce membre est désactivé' using errcode = '22023'; end if;
  if m.role = 'gerant' then raise exception 'Le gérant se connecte avec son e-mail' using errcode = '22023'; end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.members set invite_hash = public._token_hash(v_token), invite_expires_at = now() + interval '7 days'
  where id = p_member;
  return v_token;
end $$;

-- Ce qu'on peut montrer avant de rejoindre (visiteur non connecté) : le prénom et l'entreprise.
create or replace function public.invite_info(p_token text)
returns table (first_name text, company_name text) language sql stable security definer set search_path = '' as $$
  select m.first_name, c.name from public.members m join public.companies c on c.id = m.company_id
  where m.invite_hash = public._token_hash(p_token) and m.invite_expires_at > now() and m.active
$$;

create or replace function public.claim_invite(p_token text)
returns public.member_role language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select * into m from public.members
  where invite_hash = public._token_hash(p_token) and invite_expires_at > now() and active
  for update;
  if not found then raise exception 'Ce lien n''est plus valable. Demandez-en un nouveau à votre gérant.' using errcode = 'P0002'; end if;
  -- Le même appareil était peut-être lié à une autre fiche de la même entreprise.
  update public.members set user_id = null where user_id = auth.uid() and company_id = m.company_id and id <> m.id;
  update public.members set user_id = auth.uid(), invite_hash = null, invite_expires_at = null where id = m.id;
  return m.role;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Abonnement
-- ---------------------------------------------------------------------------
alter table public.companies alter column trial_ends_at set default (now() + interval '14 days');
alter table public.companies
  add column stripe_subscription_id text,
  add column billing_interval text check (billing_interval in ('month', 'year')),
  add column current_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false,
  add column pilot_until timestamptz,
  add column pilot_discount boolean not null default false;
alter table public.companies add constraint companies_plan check (plan in ('starter', 'pro', 'business'));

-- Les champs d'abonnement ne sont modifiables que par Swipo (paiement Stripe), jamais par l'entreprise.
revoke update on public.companies from authenticated, anon;
grant update (name, siret, phone, address, logo_path, trades) on public.companies to authenticated;

-- Nombre de salariés (hors gérant) compris dans chaque offre.
create or replace function public.plan_limit(p_plan text)
returns int language sql immutable set search_path = '' as $$
  select case p_plan when 'business' then 30 when 'pro' then 10 else 5 end
$$;

-- État de l'accès : pilote (gratuit), actif (abonné), essai, ou expiré.
create or replace function public.company_access(p_company uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when c.pilot_until is not null and c.pilot_until > now() then 'pilote'
    when c.subscription_status in ('active', 'past_due') then 'actif'
    when c.trial_ends_at > now() then 'essai'
    else 'expire' end
  from public.companies c
  where c.id = p_company and (auth.uid() is null or c.id in (select public.my_company_ids()))
$$;

-- Pendant l'essai et le pilote, pas de limite pratique (30) ; ensuite, celle de l'offre choisie.
create or replace function public._trg_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_access text; v_limit int; v_count int; v_plan text;
begin
  if not new.active or new.role = 'gerant' then return new; end if;
  if tg_op = 'UPDATE' and old.active and old.role <> 'gerant' then return new; end if;
  v_access := public.company_access(new.company_id);
  select plan into v_plan from public.companies where id = new.company_id;
  v_limit := case when v_access in ('pilote', 'essai') then 30 else public.plan_limit(v_plan) end;
  select count(*) into v_count from public.members
  where company_id = new.company_id and active and role <> 'gerant' and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Votre offre comprend % salariés. Passez à l''offre supérieure pour en ajouter.', v_limit using errcode = '22023';
  end if;
  return new;
end $$;
create trigger members_limit before insert or update of active, role on public.members
  for each row execute function public._trg_member_limit();

-- Codes pilotes : donnés par Swipo à ses entreprises pilotes (gratuit pendant le pilote, puis -50 % à vie).
create table public.pilot_codes (
  code text primary key,
  uses_left int not null default 1 check (uses_left >= 0),
  pilot_days int not null default 90,
  created_at timestamptz not null default now()
);
alter table public.pilot_codes enable row level security; -- aucune lecture directe

create or replace function public.redeem_pilot_code(p_code text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_code public.pilot_codes; v_until timestamptz;
begin
  select m.company_id into v_company from public.members m where m.user_id = auth.uid() and m.active and m.role = 'gerant' limit 1;
  if v_company is null then raise exception 'Réservé au gérant' using errcode = '42501'; end if;
  if exists (select 1 from public.companies where id = v_company and pilot_discount) then
    raise exception 'Votre entreprise est déjà pilote' using errcode = '22023';
  end if;
  select * into v_code from public.pilot_codes where upper(code) = upper(trim(p_code)) for update;
  if not found or v_code.uses_left < 1 then raise exception 'Ce code n''est pas valable' using errcode = 'P0002'; end if;
  update public.pilot_codes set uses_left = uses_left - 1 where code = v_code.code;
  v_until := now() + make_interval(days => v_code.pilot_days);
  update public.companies set pilot_until = v_until, pilot_discount = true where id = v_company;
  return v_until;
end $$;

-- Mise à jour par le serveur de Swipo après un paiement Stripe. Protégée par un secret connu
-- du seul serveur (le secret de signature des webhooks Stripe), gardé dans un schéma non exposé.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.settings (key text primary key, value text not null);

create or replace function public.billing_update(
  p_secret text, p_company uuid, p_customer text default null, p_subscription text default null,
  p_status text default null, p_plan text default null, p_interval text default null,
  p_period_end timestamptz default null, p_cancel boolean default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_expected text; v_company uuid;
begin
  select value into v_expected from private.settings where key = 'stripe_webhook_secret';
  if v_expected is null or p_secret is null or p_secret <> v_expected then
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

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
revoke execute on function public._token_hash(text), public._trg_member_limit() from public, anon, authenticated;
revoke execute on function public.create_invite_link(uuid), public.invite_info(text), public.claim_invite(text),
  public.plan_limit(text), public.company_access(uuid), public.redeem_pilot_code(text),
  public.billing_update(text, uuid, text, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.invite_info(text), public.billing_update(text, uuid, text, text, text, text, text, timestamptz, boolean) to anon, authenticated;
grant execute on function public.create_invite_link(uuid), public.claim_invite(text), public.plan_limit(text),
  public.company_access(uuid), public.redeem_pilot_code(text) to authenticated;
