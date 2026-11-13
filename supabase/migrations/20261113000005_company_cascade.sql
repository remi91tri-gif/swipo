-- Swipo — suppression complète d'une entreprise (RGPD : effacement sur demande).
-- Chaque table est rattachée directement à l'entreprise : supprimer l'entreprise
-- supprime en une fois ses chantiers, photos, imprévus, historique et notifications.

alter table public.sites add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.jobs add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.job_services add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.job_assignments add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.checklist_items add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.incidents add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.photos add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.job_events add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.reports add foreign key (company_id) references public.companies (id) on delete cascade;
alter table public.notifications add foreign key (company_id) references public.companies (id) on delete cascade;

-- Index utiles aux suppressions en cascade et aux filtres par entreprise.
create index if not exists sites_company_idx on public.sites (company_id);
create index if not exists job_services_job_idx on public.job_services (job_id);
create index if not exists checklist_items_job_idx on public.checklist_items (job_id);
create index if not exists incidents_job_idx on public.incidents (job_id);
create index if not exists photos_job_idx on public.photos (job_id);
create index if not exists clients_company_idx on public.clients (company_id);
