-- Swipo — sécurité : fonctions d'accès et règles par ligne (RLS).
-- Principe : on lit ce que son rôle autorise ; on écrit soit en tant que gérant,
-- soit via les fonctions métier plus bas (agents).

-- ---------------------------------------------------------------------------
-- Fonctions d'accès (security definer : elles lisent members sans repasser par RLS)
-- ---------------------------------------------------------------------------
create or replace function public.my_company_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.company_id from public.members m where m.user_id = auth.uid() and m.active
$$;

create or replace function public.my_member_id(p_company uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.members m
  where m.user_id = auth.uid() and m.company_id = p_company and m.active
$$;

create or replace function public.has_role(p_company uuid, variadic p_roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.company_id = p_company and m.active and m.role = any (p_roles)
  )
$$;

create or replace function public.is_assigned(p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.job_assignments ja
    join public.members m on m.id = ja.member_id
    where ja.job_id = p_job and m.user_id = auth.uid() and m.active
  )
$$;

-- Un chantier est visible par le gérant et les chefs d'équipe de l'entreprise,
-- et par les agents qui y sont affectés.
create or replace function public.can_see_job(p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job
      and (public.has_role(j.company_id, 'gerant', 'chef') or public.is_assigned(j.id))
  )
$$;

-- ---------------------------------------------------------------------------
-- Activation de RLS partout
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.members enable row level security;
alter table public.clients enable row level security;
alter table public.sites enable row level security;
alter table public.services enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.jobs enable row level security;
alter table public.job_services enable row level security;
alter table public.job_assignments enable row level security;
alter table public.checklist_items enable row level security;
alter table public.incidents enable row level security;
alter table public.photos enable row level security;
alter table public.job_events enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- Entreprise
create policy "membres lisent leur entreprise" on public.companies
  for select to authenticated using (id in (select public.my_company_ids()));
create policy "gérant modifie son entreprise" on public.companies
  for update to authenticated using (public.has_role(id, 'gerant')) with check (public.has_role(id, 'gerant'));

-- Équipe
create policy "membres lisent l'équipe" on public.members
  for select to authenticated using (company_id in (select public.my_company_ids()));
create policy "gérant gère l'équipe" on public.members
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

-- Clients : gérant et chefs uniquement (l'agent voit l'adresse via le site du chantier)
create policy "gérant et chefs lisent les clients" on public.clients
  for select to authenticated using (public.has_role(company_id, 'gerant', 'chef'));
create policy "gérant gère les clients" on public.clients
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "sites visibles" on public.sites
  for select to authenticated using (
    public.has_role(company_id, 'gerant', 'chef')
    or exists (select 1 from public.jobs j where j.site_id = sites.id and public.is_assigned(j.id))
  );
create policy "gérant gère les sites" on public.sites
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

-- Catalogue
create policy "membres lisent le catalogue" on public.services
  for select to authenticated using (company_id in (select public.my_company_ids()));
create policy "gérant gère le catalogue" on public.services
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));
create policy "membres lisent les modèles" on public.checklist_templates
  for select to authenticated using (company_id in (select public.my_company_ids()));
create policy "gérant gère les modèles" on public.checklist_templates
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

-- Chantiers : lecture selon can_see_job ; écriture directe réservée au gérant
create policy "chantiers visibles" on public.jobs
  for select to authenticated using (public.has_role(company_id, 'gerant', 'chef') or public.is_assigned(id));
create policy "gérant gère les chantiers" on public.jobs
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "prestations visibles" on public.job_services
  for select to authenticated using (public.can_see_job(job_id));
create policy "gérant gère les prestations" on public.job_services
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "affectations visibles" on public.job_assignments
  for select to authenticated using (public.can_see_job(job_id));
create policy "gérant affecte" on public.job_assignments
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "checklist visible" on public.checklist_items
  for select to authenticated using (public.can_see_job(job_id));
create policy "gérant gère la checklist" on public.checklist_items
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "imprévus visibles" on public.incidents
  for select to authenticated using (public.can_see_job(job_id));

-- Photos : l'équipe du chantier ajoute ses propres photos
create policy "photos visibles" on public.photos
  for select to authenticated using (public.can_see_job(job_id));
create policy "équipe ajoute ses photos" on public.photos
  for insert to authenticated with check (
    public.can_see_job(job_id) and taken_by = public.my_member_id(company_id)
  );
create policy "gérant gère les photos" on public.photos
  for update to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "historique visible" on public.job_events
  for select to authenticated using (public.can_see_job(job_id));

create policy "gérant gère les rapports" on public.reports
  for all to authenticated using (public.has_role(company_id, 'gerant')) with check (public.has_role(company_id, 'gerant'));

create policy "chacun lit ses notifications" on public.notifications
  for select to authenticated using (member_id = public.my_member_id(company_id));
create policy "chacun marque ses notifications lues" on public.notifications
  for update to authenticated using (member_id = public.my_member_id(company_id)) with check (member_id = public.my_member_id(company_id));
