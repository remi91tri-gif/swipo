-- Swipo — lot 6 (hors connexion) et notifications.
--
-- 1. Les actions faites sans réseau sont envoyées plus tard : l'agent transmet l'heure réelle du geste
--    (p_at). Elle est bornée : jamais dans le futur, jamais plus de 2 jours en arrière.
-- 2. Les notifications arrivent en direct (Supabase Realtime) et un contrôle toutes les 5 minutes
--    prévient le gérant d'un chantier qui n'a pas démarré 30 minutes après l'heure prévue.

create or replace function public._clamp_at(p_at timestamptz)
returns timestamptz language sql stable set search_path = '' as $$
  select case when p_at is null then now() else least(now(), greatest(p_at, now() - interval '2 days')) end
$$;

-- ---------------------------------------------------------------------------
-- Actions de l'agent avec l'heure réelle
-- ---------------------------------------------------------------------------
drop function public.start_job(uuid);
create function public.start_job(p_job uuid, p_at timestamptz default null)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare j public.jobs; v_me uuid; v_at timestamptz := public._clamp_at(p_at);
begin
  j := public._job_for_update(p_job);
  if not public.is_assigned(p_job) then raise exception 'Vous n''êtes pas affecté à ce chantier' using errcode = '42501'; end if;
  if j.status not in ('planifie', 'a_reprendre') then
    raise exception 'Ce chantier ne peut pas être démarré (statut : %)', j.status using errcode = '22023';
  end if;
  v_me := public.my_member_id(j.company_id);
  update public.jobs set status = 'en_cours', started_at = coalesce(started_at, v_at), updated_at = now() where id = p_job;
  insert into public.job_events (company_id, job_id, type, actor_id, at)
  values (j.company_id, p_job, case when j.status = 'a_reprendre' then 'reprise_demarree' else 'demarre' end, v_me, v_at);
  return 'en_cours';
end $$;

drop function public.finish_job(uuid, text);
create function public.finish_job(p_job uuid, p_comment text default null, p_at timestamptz default null)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare j public.jobs; v_missing text[] := '{}'; v_at timestamptz := public._clamp_at(p_at);
begin
  j := public._job_for_update(p_job);
  if not public.is_assigned(p_job) then raise exception 'Vous n''êtes pas affecté à ce chantier' using errcode = '42501'; end if;
  if j.status <> 'en_cours' then raise exception 'Le chantier n''est pas en cours' using errcode = '22023'; end if;
  if j.photos_before_required and not exists (select 1 from public.photos where job_id = p_job and kind = 'avant') then
    v_missing := array_append(v_missing, 'photo avant');
  end if;
  if j.photos_after_required and not exists (select 1 from public.photos where job_id = p_job and kind = 'apres') then
    v_missing := array_append(v_missing, 'photo après');
  end if;
  if j.checklist_required and exists (select 1 from public.checklist_items where job_id = p_job and not done) then
    v_missing := array_append(v_missing, 'checklist');
  end if;
  if array_length(v_missing, 1) > 0 then
    raise exception 'Il manque : %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;
  update public.jobs set status = 'termine', finished_at = greatest(v_at, coalesce(started_at, v_at)),
    finish_comment = nullif(trim(p_comment), ''), updated_at = now()
  where id = p_job;
  insert into public.job_events (company_id, job_id, type, actor_id, at, data)
  values (j.company_id, p_job, 'termine', public.my_member_id(j.company_id), v_at, jsonb_build_object('commentaire', p_comment));
  perform public._notify_managers(j.company_id, p_job, 'chantier_termine');
  return 'termine';
end $$;

drop function public.report_incident(uuid, public.incident_category, public.incident_urgency, text);
create function public.report_incident(
  p_job uuid, p_category public.incident_category, p_urgency public.incident_urgency, p_comment text default null, p_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare j public.jobs; v_id uuid; v_me uuid; v_at timestamptz := public._clamp_at(p_at);
begin
  j := public._job_for_update(p_job);
  if j.status in ('valide', 'annule') then raise exception 'Ce chantier est clos' using errcode = '22023'; end if;
  v_me := public.my_member_id(j.company_id);
  insert into public.incidents (company_id, job_id, category, urgency, comment, reported_by, reported_at)
  values (j.company_id, p_job, p_category, p_urgency, p_comment, v_me, v_at) returning id into v_id;
  if p_urgency = 'bloquant' and j.status = 'en_cours' then
    update public.jobs set status = 'a_traiter', updated_at = now() where id = p_job;
  end if;
  insert into public.job_events (company_id, job_id, type, actor_id, at, data)
  values (j.company_id, p_job, 'imprevu', v_me, v_at, jsonb_build_object('incident', v_id, 'urgence', p_urgency));
  perform public._notify_managers(j.company_id, p_job, case when p_urgency = 'bloquant' then 'imprevu_bloquant' else 'imprevu_info' end);
  return v_id;
end $$;

revoke execute on function public._clamp_at(timestamptz) from public, anon, authenticated;
revoke execute on function public.start_job(uuid, timestamptz), public.finish_job(uuid, text, timestamptz),
  public.report_incident(uuid, public.incident_category, public.incident_urgency, text, timestamptz) from public, anon;
grant execute on function public.start_job(uuid, timestamptz), public.finish_job(uuid, text, timestamptz),
  public.report_incident(uuid, public.incident_category, public.incident_urgency, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Chantiers non démarrés 30 minutes après l'heure prévue
-- ---------------------------------------------------------------------------
create index if not exists notifications_job_type on public.notifications (job_id, type);

create or replace function public.notify_late_jobs()
returns int language plpgsql security definer set search_path = '' as $$
declare v_count int := 0; r record;
begin
  for r in
    select j.id, j.company_id from public.jobs j
    where j.status = 'planifie'
      and j.scheduled_date is not null and j.start_time is not null
      and ((j.scheduled_date + j.start_time) at time zone 'Europe/Paris') + interval '30 minutes' < now()
      and ((j.scheduled_date + j.start_time) at time zone 'Europe/Paris') > now() - interval '1 day'
      and not exists (select 1 from public.notifications n where n.job_id = j.id and n.type = 'chantier_en_retard')
  loop
    perform public._notify_managers(r.company_id, r.id, 'chantier_en_retard');
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.notify_late_jobs() from public, anon, authenticated;

-- Contrôle toutes les 5 minutes (si pg_cron est disponible, comme sur Supabase).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('swipo-chantiers-en-retard', '*/5 * * * *', 'select public.notify_late_jobs()');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications en direct
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
