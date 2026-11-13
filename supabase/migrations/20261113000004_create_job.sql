-- Swipo — lot 2 : création d'un chantier en une seule opération.
-- Client et adresse existants ou nouveaux, agents, checklist et prestation sont
-- enregistrés ensemble : en cas d'erreur, rien n'est créé à moitié.

create or replace function public.create_job(
  p_title text,
  p_trade text,
  p_client uuid default null,
  p_new_client jsonb default null,       -- {"name", "type", "phone", "email", "contact_name"}
  p_site uuid default null,
  p_new_site jsonb default null,         -- {"address", "access_info", "onsite_contact", "label"}
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
  v_company uuid;
  v_client uuid := p_client;
  v_site uuid := p_site;
  v_job uuid;
  v_me uuid;
  v_item text;
  v_pos int := 0;
begin
  -- L'entreprise : celle du client choisi, sinon celle dont l'appelant est gérant.
  if v_client is not null then
    select company_id into v_company from public.clients where id = v_client;
  else
    select m.company_id into v_company from public.members m
    where m.user_id = auth.uid() and m.active and m.role = 'gerant' limit 1;
  end if;
  if v_company is null or not public.has_role(v_company, 'gerant') then
    raise exception 'Réservé au gérant' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Indiquez la prestation' using errcode = '22023';
  end if;
  v_me := public.my_member_id(v_company);

  if v_client is null then
    if coalesce(trim(p_new_client ->> 'name'), '') = '' then
      raise exception 'Choisissez un client ou indiquez son nom' using errcode = '22023';
    end if;
    insert into public.clients (company_id, name, type, phone, email, contact_name)
    values (
      v_company, trim(p_new_client ->> 'name'),
      coalesce(nullif(p_new_client ->> 'type', ''), 'particulier')::public.client_type,
      nullif(trim(p_new_client ->> 'phone'), ''), nullif(trim(p_new_client ->> 'email'), ''),
      nullif(trim(p_new_client ->> 'contact_name'), '')
    ) returning id into v_client;
  end if;

  if v_site is null then
    if coalesce(trim(p_new_site ->> 'address'), '') = '' then
      raise exception 'Indiquez l''adresse du chantier' using errcode = '22023';
    end if;
    insert into public.sites (company_id, client_id, address, access_info, onsite_contact, label)
    values (
      v_company, v_client, trim(p_new_site ->> 'address'),
      nullif(trim(p_new_site ->> 'access_info'), ''), nullif(trim(p_new_site ->> 'onsite_contact'), ''),
      nullif(trim(p_new_site ->> 'label'), '')
    ) returning id into v_site;
  elsif not exists (select 1 from public.sites where id = v_site and client_id = v_client) then
    raise exception 'Cette adresse n''appartient pas à ce client' using errcode = '22023';
  end if;

  insert into public.jobs (
    company_id, client_id, site_id, title, scheduled_date, start_time, duration_min, instructions,
    photos_before_required, photos_after_required, checklist_required, created_by
  ) values (
    v_company, v_client, v_site, trim(p_title), p_date, p_time, p_duration, nullif(trim(p_instructions), ''),
    p_photos_required, p_photos_required, coalesce(array_length(p_checklist, 1), 0) > 0, v_me
  ) returning id into v_job;

  insert into public.job_services (company_id, job_id, label)
  values (v_company, v_job, coalesce(nullif(trim(p_trade), ''), trim(p_title)));

  foreach v_item in array coalesce(p_checklist, '{}') loop
    if trim(v_item) <> '' then
      v_pos := v_pos + 1;
      insert into public.checklist_items (company_id, job_id, label, position) values (v_company, v_job, trim(v_item), v_pos);
    end if;
  end loop;

  if coalesce(array_length(p_members, 1), 0) > 0 then
    insert into public.job_assignments (company_id, job_id, member_id, is_lead)
    select v_company, v_job, m, m = p_lead from unnest(p_members) as m;
  end if;

  return v_job;
end $$;

revoke execute on function public.create_job(text, text, uuid, jsonb, uuid, jsonb, date, time, int, text, boolean, text[], uuid[], uuid) from public, anon;
grant execute on function public.create_job(text, text, uuid, jsonb, uuid, jsonb, date, time, int, text, boolean, text[], uuid[], uuid) to authenticated;
