-- Swipo — conservation des données (RGPD) : 90 jours après la fin de l'accès, tout est supprimé.
-- Fin de l'accès = fin de l'essai, de la période payée après résiliation ou du pilote (la plus tardive).
-- Un e-mail de rappel part 14 jours avant ; la suppression n'a jamais lieu sans ce rappel.
-- Ces fonctions ne sont appelées que par la tâche quotidienne du serveur (clé secrète).

alter table public.companies add column if not exists retention_notice_at timestamptz;

-- Date de fin d'accès (null tant que l'entreprise a un accès : essai, pilote ou abonnement en cours).
create or replace function public.access_ended_at(c public.companies)
returns timestamptz language sql stable set search_path = '' as $$
  select case
    when c.subscription_status in ('active', 'past_due') then null
    when greatest(c.trial_ends_at, coalesce(c.current_period_end, '-infinity'), coalesce(c.pilot_until, '-infinity')) > now() then null
    else greatest(c.trial_ends_at, coalesce(c.current_period_end, '-infinity'), coalesce(c.pilot_until, '-infinity'))
  end
$$;

-- Entreprises à prévenir (J-14) ou à supprimer (J+90, rappel envoyé depuis au moins 13 jours).
create or replace function public.retention_due()
returns table (company_id uuid, company_name text, action text, ended_at timestamptz, delete_on date, emails text[],
  stripe_customer_id text, stripe_subscription_id text)
language sql stable security definer set search_path = '' as $$
  with c as (
    select co.*, public.access_ended_at(co) as ended from public.companies co
  )
  select c.id, c.name,
    case when c.retention_notice_at is not null and c.retention_notice_at >= c.ended
              and now() >= c.ended + interval '90 days' and c.retention_notice_at <= now() - interval '13 days' then 'supprimer'
         else 'prevenir' end,
    c.ended, greatest(c.ended + interval '90 days', coalesce(c.retention_notice_at, now()) + interval '14 days')::date,
    array(select u.email from public.members m join auth.users u on u.id = m.user_id
          where m.company_id = c.id and m.role = 'gerant' and m.active and u.email is not null),
    c.stripe_customer_id, c.stripe_subscription_id
  from c
  where c.ended is not null and now() >= c.ended + interval '76 days'
    and (c.retention_notice_at is null or c.retention_notice_at < c.ended
         or (now() >= c.ended + interval '90 days' and c.retention_notice_at <= now() - interval '13 days'))
$$;

create or replace function public.retention_mark_notified(p_company uuid)
returns void language sql security definer set search_path = '' as $$
  update public.companies set retention_notice_at = now() where id = p_company
$$;

-- Suppression définitive (les fichiers ont été effacés avant par le serveur).
create or replace function public.retention_delete(p_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_users uuid[];
begin
  if not exists (select 1 from public.retention_due() d where d.company_id = p_company and d.action = 'supprimer') then
    raise exception 'Cette entreprise n''est pas à supprimer' using errcode = '22023';
  end if;
  select coalesce(array_agg(user_id), '{}') into v_users from public.members where company_id = p_company and user_id is not null;
  delete from public.companies where id = p_company;
  delete from auth.users u where u.id = any (v_users) and not exists (select 1 from public.members m where m.user_id = u.id);
end $$;

-- Sessions « appareil » orphelines (téléphone reconnecté, lien réutilisé…) : supprimées après 7 jours.
create or replace function public.purge_orphan_devices()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '7 days'
    and not exists (select 1 from public.members m where m.user_id = u.id);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.access_ended_at(public.companies), public.retention_due(), public.retention_mark_notified(uuid),
  public.retention_delete(uuid), public.purge_orphan_devices() from public, anon, authenticated;
grant execute on function public.retention_due(), public.retention_mark_notified(uuid),
  public.retention_delete(uuid), public.purge_orphan_devices() to service_role;
