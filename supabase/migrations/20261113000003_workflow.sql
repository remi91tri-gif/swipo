-- Swipo — règles métier du cycle d'un chantier (cahier des charges, section 8).
-- Toutes ces fonctions s'exécutent avec les droits du propriétaire (security definer)
-- et vérifient elles-mêmes qui appelle et dans quel statut se trouve le chantier.

create or replace function public._log_event(p_company uuid, p_job uuid, p_type text, p_actor uuid, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.job_events (company_id, job_id, type, actor_id, data)
  values (p_company, p_job, p_type, p_actor, coalesce(p_data, '{}'));
$$;

create or replace function public._notify_managers(p_company uuid, p_job uuid, p_type text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (company_id, member_id, type, job_id)
  select m.company_id, m.id, p_type, p_job from public.members m
  where m.company_id = p_company and m.role = 'gerant' and m.active;
$$;

create or replace function public._notify_assignees(p_job uuid, p_type text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (company_id, member_id, type, job_id)
  select ja.company_id, ja.member_id, p_type, ja.job_id from public.job_assignments ja where ja.job_id = p_job;
$$;

-- Le chantier courant, verrouillé, avec contrôle d'accès.
create or replace function public._job_for_update(p_job uuid)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = p_job for update;
  if not found or not public.can_see_job(p_job) then
    raise exception 'Chantier introuvable' using errcode = 'P0002';
  end if;
  return j;
end $$;

-- ---------------------------------------------------------------------------
-- Inscription : le gérant crée son entreprise et devient son premier membre.
-- ---------------------------------------------------------------------------
create or replace function public.create_company(
  p_name text, p_first_name text, p_last_name text default '', p_phone text default null, p_trades text[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'Ce compte appartient déjà à une entreprise' using errcode = '23505';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.companies (name, phone, trades) values (p_name, p_phone, coalesce(p_trades, '{}'))
  returning id into v_company;
  insert into public.members (company_id, user_id, first_name, last_name, phone, email, role)
  values (v_company, auth.uid(), p_first_name, coalesce(p_last_name, ''), p_phone, v_email, 'gerant');
  return v_company;
end $$;

-- Numéro au format international sans signes : « 06 12 34 56 78 », « +33 6 12… »
-- et « 0033 6 12… » donnent tous 33612345678.
create or replace function public.normalize_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d is null or d = '' then null
    when d like '00%' then substr(d, 3)
    when d like '0%' and length(d) = 10 then '33' || substr(d, 2)
    else d end
  from (select regexp_replace(p, '\D', '', 'g') as d) s
$$;

-- Un agent invité se connecte pour la première fois par SMS : on relie son compte
-- à la fiche créée par le gérant (même numéro de téléphone).
create or replace function public.claim_invitation()
returns int language plpgsql security definer set search_path = '' as $$
declare v_phone text; v_count int;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select phone into v_phone from auth.users where id = auth.uid();
  if v_phone is null then return 0; end if;
  update public.members set user_id = auth.uid()
  where user_id is null and active
    and public.normalize_phone(phone) = public.normalize_phone(v_phone);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- À planifier ⇄ Planifié : automatique selon la date, l'heure et les agents.
-- ---------------------------------------------------------------------------
create or replace function public._refresh_planning_status(p_job uuid)
returns void language sql security definer set search_path = '' as $$
  update public.jobs j set status = case
      when j.scheduled_date is not null and j.start_time is not null
           and exists (select 1 from public.job_assignments ja where ja.job_id = j.id)
      then 'planifie'::public.job_status else 'a_planifier'::public.job_status end,
    updated_at = now()
  where j.id = p_job and j.status in ('a_planifier', 'planifie');
$$;

create or replace function public._trg_assignments_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public._refresh_planning_status(coalesce(new.job_id, old.job_id));
  if tg_op = 'INSERT' then
    insert into public.notifications (company_id, member_id, type, job_id)
    values (new.company_id, new.member_id, 'mission_assignee', new.job_id);
  end if;
  return null;
end $$;
create trigger assignments_status after insert or delete on public.job_assignments
  for each row execute function public._trg_assignments_status();

create or replace function public._trg_jobs_schedule() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.scheduled_date is distinct from old.scheduled_date
     or new.start_time is distinct from old.start_time then
    perform public._refresh_planning_status(new.id);
  end if;
  if tg_op = 'INSERT' then
    perform public._log_event(new.company_id, new.id, 'cree', new.created_by);
  end if;
  return null;
end $$;
create trigger jobs_schedule after insert or update of scheduled_date, start_time on public.jobs
  for each row execute function public._trg_jobs_schedule();

-- ---------------------------------------------------------------------------
-- Côté agent
-- ---------------------------------------------------------------------------
create or replace function public.start_job(p_job uuid)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare j public.jobs; v_me uuid;
begin
  j := public._job_for_update(p_job);
  if not public.is_assigned(p_job) then raise exception 'Vous n''êtes pas affecté à ce chantier' using errcode = '42501'; end if;
  if j.status not in ('planifie', 'a_reprendre') then
    raise exception 'Ce chantier ne peut pas être démarré (statut : %)', j.status using errcode = '22023';
  end if;
  v_me := public.my_member_id(j.company_id);
  update public.jobs set status = 'en_cours', started_at = coalesce(started_at, now()), updated_at = now() where id = p_job;
  perform public._log_event(j.company_id, p_job, case when j.status = 'a_reprendre' then 'reprise_demarree' else 'demarre' end, v_me);
  return 'en_cours';
end $$;

create or replace function public.set_checklist_item(p_item uuid, p_done boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job uuid; v_company uuid; v_status public.job_status;
begin
  select ci.job_id, ci.company_id, j.status into v_job, v_company, v_status
  from public.checklist_items ci join public.jobs j on j.id = ci.job_id where ci.id = p_item;
  if v_job is null or not (public.is_assigned(v_job) or public.has_role(v_company, 'gerant', 'chef')) then
    raise exception 'Élément introuvable' using errcode = 'P0002';
  end if;
  if v_status <> 'en_cours' then raise exception 'Le chantier doit être en cours' using errcode = '22023'; end if;
  update public.checklist_items set done = p_done,
    done_by = case when p_done then public.my_member_id(v_company) end,
    done_at = case when p_done then now() end
  where id = p_item;
end $$;

create or replace function public.finish_job(p_job uuid, p_comment text default null)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare j public.jobs; v_missing text[] := '{}';
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
  update public.jobs set status = 'termine', finished_at = now(), finish_comment = nullif(trim(p_comment), ''), updated_at = now()
  where id = p_job;
  perform public._log_event(j.company_id, p_job, 'termine', public.my_member_id(j.company_id), jsonb_build_object('commentaire', p_comment));
  perform public._notify_managers(j.company_id, p_job, 'chantier_termine');
  return 'termine';
end $$;

create or replace function public.report_incident(
  p_job uuid, p_category public.incident_category, p_urgency public.incident_urgency, p_comment text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare j public.jobs; v_id uuid; v_me uuid;
begin
  j := public._job_for_update(p_job);
  if j.status in ('valide', 'annule') then raise exception 'Ce chantier est clos' using errcode = '22023'; end if;
  v_me := public.my_member_id(j.company_id);
  insert into public.incidents (company_id, job_id, category, urgency, comment, reported_by)
  values (j.company_id, p_job, p_category, p_urgency, p_comment, v_me) returning id into v_id;
  if p_urgency = 'bloquant' and j.status = 'en_cours' then
    update public.jobs set status = 'a_traiter', updated_at = now() where id = p_job;
  end if;
  perform public._log_event(j.company_id, p_job, 'imprevu', v_me, jsonb_build_object('incident', v_id, 'urgence', p_urgency));
  perform public._notify_managers(j.company_id, p_job, case when p_urgency = 'bloquant' then 'imprevu_bloquant' else 'imprevu_info' end);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Côté gérant
-- ---------------------------------------------------------------------------
create or replace function public.decide_incident(p_incident uuid, p_decision public.incident_decision, p_message text default null)
returns public.job_status language plpgsql security definer set search_path = '' as $$
declare i public.incidents; j public.jobs; v_status public.job_status;
begin
  select * into i from public.incidents where id = p_incident;
  if not found or not public.has_role(i.company_id, 'gerant') then
    raise exception 'Imprévu introuvable' using errcode = 'P0002';
  end if;
  j := public._job_for_update(i.job_id);
  update public.incidents set decision = p_decision, manager_message = p_message,
    decided_by = public.my_member_id(i.company_id), decided_at = now() where id = p_incident;
  v_status := j.status;
  if j.status = 'a_traiter' then
    v_status := case p_decision
      when 'continuer' then 'en_cours'::public.job_status
      when 'attendre' then 'a_traiter'::public.job_status
      when 'reprogrammer' then 'planifie'::public.job_status
      when 'ne_pas_effectuer' then 'annule'::public.job_status end;
  elsif p_decision = 'ne_pas_effectuer' and j.status not in ('valide', 'annule') then
    v_status := 'annule';
  end if;
  update public.jobs set status = v_status, updated_at = now(),
    cancel_reason = case when v_status = 'annule' then coalesce(p_message, 'Décision sur imprévu') else cancel_reason end
  where id = j.id;
  perform public._log_event(i.company_id, j.id, 'decision', public.my_member_id(i.company_id),
    jsonb_build_object('incident', p_incident, 'decision', p_decision, 'message', p_message));
  perform public._notify_assignees(j.id, 'decision_gerant');
  return v_status;
end $$;

create or replace function public.validate_jobs(p_jobs uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare v_job uuid; v_count int := 0; j public.jobs;
begin
  foreach v_job in array p_jobs loop
    select * into j from public.jobs where id = v_job for update;
    if found and public.has_role(j.company_id, 'gerant') and j.status = 'termine' then
      update public.jobs set status = 'valide', validated_at = now(),
        validated_by = public.my_member_id(j.company_id), updated_at = now() where id = v_job;
      perform public._log_event(j.company_id, v_job, 'valide', public.my_member_id(j.company_id));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

create or replace function public.request_rework(
  p_job uuid, p_reason text, p_date date default null, p_time time default null, p_members uuid[] default null
) returns void language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  j := public._job_for_update(p_job);
  if not public.has_role(j.company_id, 'gerant') then raise exception 'Réservé au gérant' using errcode = '42501'; end if;
  if j.status <> 'termine' then raise exception 'Seul un chantier terminé peut être repris' using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Indiquez ce qui doit être refait' using errcode = '22023'; end if;
  if p_members is not null then
    delete from public.job_assignments where job_id = p_job;
    insert into public.job_assignments (company_id, job_id, member_id)
    select j.company_id, p_job, unnest(p_members);
  end if;
  update public.jobs set status = 'a_reprendre',
    scheduled_date = coalesce(p_date, scheduled_date), start_time = coalesce(p_time, start_time), updated_at = now()
  where id = p_job;
  perform public._log_event(j.company_id, p_job, 'reprise_demandee', public.my_member_id(j.company_id),
    jsonb_build_object('motif', p_reason, 'date', p_date));
  perform public._notify_assignees(p_job, 'reprise_demandee');
end $$;

-- Seules ces fonctions sont exposées aux utilisateurs connectés. Sur Supabase, toute
-- fonction est appelable par défaut : on retire tout, puis on rouvre la liste ci-dessous.
-- Les fonctions internes (préfixe _) restent fermées.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.normalize_phone(text), public.my_company_ids(), public.my_member_id(uuid),
  public.has_role(uuid, public.member_role[]), public.is_assigned(uuid), public.can_see_job(uuid),
  public.create_company(text, text, text, text, text[]), public.claim_invitation(),
  public.start_job(uuid), public.set_checklist_item(uuid, boolean), public.finish_job(uuid, text),
  public.report_incident(uuid, public.incident_category, public.incident_urgency, text),
  public.decide_incident(uuid, public.incident_decision, text), public.validate_jobs(uuid[]),
  public.request_rework(uuid, text, date, time, uuid[])
to authenticated;
