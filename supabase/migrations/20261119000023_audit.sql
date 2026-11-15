-- Swipo — corrections de l'audit avant lancement.
-- 1. L'état des abonnements n'est plus écrit que par le serveur (clé secrète Supabase) : plus aucun
--    navigateur, connecté ou non, ne peut appeler billing_update.
revoke execute on function public.billing_update(text, uuid, text, text, text, text, text, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.billing_update(text, uuid, text, text, text, text, text, timestamptz, boolean) to service_role;

-- 2. Index : recherches fréquentes et suppression rapide d'une entreprise (toutes ses données d'un coup).
create index if not exists jobs_client_idx on public.jobs (client_id);
create index if not exists jobs_site_idx on public.jobs (site_id);
create index if not exists sites_client_idx on public.sites (client_id);
create index if not exists notifications_member_created_idx on public.notifications (member_id, created_at desc);
create index if not exists photos_incident_idx on public.photos (incident_id) where incident_id is not null;
create index if not exists checklist_items_company_idx on public.checklist_items (company_id);
create index if not exists checklist_templates_company_idx on public.checklist_templates (company_id);
create index if not exists incidents_company_idx on public.incidents (company_id);
create index if not exists job_assignments_company_idx on public.job_assignments (company_id);
create index if not exists job_events_company_idx on public.job_events (company_id);
create index if not exists job_services_company_idx on public.job_services (company_id);
create index if not exists notifications_company_idx on public.notifications (company_id);
create index if not exists photos_company_idx on public.photos (company_id);
create index if not exists reports_company_idx on public.reports (company_id);
create index if not exists services_company_idx on public.services (company_id);
