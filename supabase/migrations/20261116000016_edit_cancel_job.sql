-- Swipo — modifier un chantier déjà créé, ou l'annuler.
-- Tant que le chantier n'a pas démarré (à planifier, planifié, à reprendre), tout se modifie en une fois :
-- client et adresse, intitulé, date, horaire, durée, consignes, preuves, checklist, agents.
-- Les agents restés sur le chantier sont prévenus (« mission modifiée »), les nouveaux reçoivent
-- « nouvelle mission », ceux qui sont retirés et ceux d'un chantier annulé sont prévenus aussi.

create or replace function public.update_job(
  p_job uuid,
  p_title text,
  p_trade text,
  p_client uuid default null,
  p_new_client jsonb default null,
  p_site uuid default null,
  p_new_site jsonb default null,
  p_date date default null,
  p_time time default null,
  p_duration int default null,
  p_instructions text default null,
  p_photos_required boolean default false,
  p_checklist text[] default '{}',
  p_members uuid[] default '{}',
  p_lead uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  v_client uuid := p_client;
  v_site uuid := p_site;
  v_me uuid;
  v_item text;
  v_pos int := 0;
  v_kept uuid[];
  v_removed uuid[];
begin
  j := public._job_for_update(p_job);
  if not public.has_role(j.company_id, 'gerant') then raise exception 'Réservé au gérant' using errcode = '42501'; end if;
  if j.status not in ('a_planifier', 'planifie', 'a_reprendre') then
    raise exception 'Ce chantier a déjà démarré : il ne peut plus être modifié' using errcode = '22023';
  end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Indiquez la prestation' using errcode = '22023'; end if;
  v_me := public.my_member_id(j.company_id);

  if v_client is null then
    if coalesce(trim(p_new_client ->> 'name'), '') = '' then
      raise exception 'Choisissez un client ou indiquez son nom' using errcode = '22023';
    end if;
    insert into public.clients (company_id, name, type, phone)
    values (j.company_id, trim(p_new_client ->> 'name'),
      coalesce(nullif(p_new_client ->> 'type', ''), 'particulier')::public.client_type, nullif(trim(p_new_client ->> 'phone'), ''))
    returning id into v_client;
  elsif not exists (select 1 from public.clients where id = v_client and company_id = j.company_id) then
    raise exception 'Client introuvable' using errcode = 'P0002';
  end if;

  if v_site is null then
    if coalesce(trim(p_new_site ->> 'address'), '') = '' then
      raise exception 'Indiquez l''adresse du chantier' using errcode = '22023';
    end if;
    insert into public.sites (company_id, client_id, address, access_info)
    values (j.company_id, v_client, trim(p_new_site ->> 'address'), nullif(trim(p_new_site ->> 'access_info'), ''))
    returning id into v_site;
  elsif not exists (select 1 from public.sites where id = v_site and client_id = v_client) then
    raise exception 'Cette adresse n''appartient pas à ce client' using errcode = '22023';
  end if;

  update public.jobs set
    client_id = v_client, site_id = v_site, title = trim(p_title),
    scheduled_date = p_date, start_time = p_time, duration_min = p_duration,
    instructions = nullif(trim(p_instructions), ''),
    photos_before_required = p_photos_required, photos_after_required = p_photos_required,
    checklist_required = coalesce(array_length(p_checklist, 1), 0) > 0,
    updated_at = now()
  where id = p_job;

  delete from public.job_services where job_id = p_job;
  insert into public.job_services (company_id, job_id, label)
  values (j.company_id, p_job, coalesce(nullif(trim(p_trade), ''), trim(p_title)));

  delete from public.checklist_items where job_id = p_job;
  foreach v_item in array coalesce(p_checklist, '{}') loop
    if trim(v_item) <> '' then
      v_pos := v_pos + 1;
      insert into public.checklist_items (company_id, job_id, label, position) values (j.company_id, p_job, trim(v_item), v_pos);
    end if;
  end loop;

  -- Agents : ceux qui restent, ceux qui partent, ceux qui arrivent (prévenus par le déclencheur).
  select coalesce(array_agg(member_id), '{}') into v_kept from public.job_assignments
  where job_id = p_job and member_id = any (coalesce(p_members, '{}'));
  select coalesce(array_agg(member_id), '{}') into v_removed from public.job_assignments
  where job_id = p_job and not (member_id = any (coalesce(p_members, '{}')));

  delete from public.job_assignments where job_id = p_job and member_id = any (v_removed);
  insert into public.job_assignments (company_id, job_id, member_id, is_lead)
  select j.company_id, p_job, m, m = p_lead from unnest(coalesce(p_members, '{}')) as m
  where not (m = any (v_kept)) and exists (select 1 from public.members x where x.id = m and x.company_id = j.company_id and x.active);
  update public.job_assignments set is_lead = (member_id = p_lead) where job_id = p_job;

  insert into public.notifications (company_id, member_id, type, job_id)
  select j.company_id, m, 'mission_modifiee', p_job from unnest(v_kept) as m;
  insert into public.notifications (company_id, member_id, type, job_id)
  select j.company_id, m, 'mission_retiree', p_job from unnest(v_removed) as m;

  perform public._refresh_planning_status(p_job);
  perform public._log_event(j.company_id, p_job, 'modifie', v_me);
  return p_job;
end $$;

create or replace function public.cancel_job(p_job uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  j := public._job_for_update(p_job);
  if not public.has_role(j.company_id, 'gerant') then raise exception 'Réservé au gérant' using errcode = '42501'; end if;
  if j.status in ('termine', 'valide', 'annule') then
    raise exception 'Ce chantier ne peut plus être annulé' using errcode = '22023';
  end if;
  update public.jobs set status = 'annule', updated_at = now() where id = p_job;
  perform public._log_event(j.company_id, p_job, 'annule', public.my_member_id(j.company_id));
  perform public._notify_assignees(p_job, 'mission_annulee');
end $$;

revoke execute on function public.update_job(uuid, text, text, uuid, jsonb, uuid, jsonb, date, time, int, text, boolean, text[], uuid[], uuid),
  public.cancel_job(uuid) from public, anon;
grant execute on function public.update_job(uuid, text, text, uuid, jsonb, uuid, jsonb, date, time, int, text, boolean, text[], uuid[], uuid),
  public.cancel_job(uuid) to authenticated;
