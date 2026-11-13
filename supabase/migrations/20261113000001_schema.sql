-- Swipo — schéma initial (MVP)
-- Toutes les tables portent company_id : une entreprise ne voit jamais les données d'une autre.
-- Les agents ne modifient pas les tables directement : ils passent par des fonctions
-- (start_job, finish_job, …) qui vérifient les droits et les changements de statut.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('gerant', 'chef', 'agent');
create type public.client_type as enum ('particulier', 'professionnel', 'syndic', 'agence');
create type public.job_status as enum (
  'a_planifier', 'planifie', 'en_cours', 'a_traiter', 'termine', 'a_reprendre', 'valide', 'annule'
);
create type public.photo_kind as enum ('reference', 'avant', 'apres', 'probleme', 'autre');
create type public.incident_category as enum (
  'acces_impossible', 'materiel_manquant', 'travail_supplementaire', 'etat_different', 'degat', 'retard', 'autre'
);
create type public.incident_urgency as enum ('bloquant', 'information');
create type public.incident_decision as enum ('continuer', 'attendre', 'reprogrammer', 'ne_pas_effectuer');

-- ---------------------------------------------------------------------------
-- Entreprise et équipe
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  siret text,
  phone text,
  address text,
  logo_path text,
  trades text[] not null default '{}',
  plan text not null default 'starter',
  max_members int not null default 5,
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null default '',
  phone text,
  email text,
  role public.member_role not null default 'agent',
  active boolean not null default true,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, user_id),
  unique (company_id, phone)
);
create index on public.members (user_id);

-- ---------------------------------------------------------------------------
-- Clients, sites, catalogue
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type public.client_type not null default 'particulier',
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, company_id)
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  client_id uuid not null,
  label text,
  address text not null,
  latitude double precision,
  longitude double precision,
  access_info text,
  onsite_contact text,
  created_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (client_id, company_id) references public.clients (id, company_id) on delete cascade
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  label text not null,
  trade text,
  default_duration_min int
);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  trade text,
  items text[] not null default '{}'
);

-- ---------------------------------------------------------------------------
-- Chantiers
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  client_id uuid not null,
  site_id uuid not null,
  title text not null,
  scheduled_date date,
  start_time time,
  duration_min int check (duration_min is null or duration_min > 0),
  instructions text,
  photos_before_required boolean not null default false,
  photos_after_required boolean not null default false,
  checklist_required boolean not null default false,
  status public.job_status not null default 'a_planifier',
  started_at timestamptz,
  finished_at timestamptz,
  finish_comment text,
  validated_at timestamptz,
  validated_by uuid,
  cancel_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (client_id, company_id) references public.clients (id, company_id),
  foreign key (site_id, company_id) references public.sites (id, company_id),
  foreign key (validated_by, company_id) references public.members (id, company_id),
  foreign key (created_by, company_id) references public.members (id, company_id)
);
create index on public.jobs (company_id, scheduled_date);

create table public.job_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  job_id uuid not null,
  service_id uuid references public.services (id) on delete set null,
  label text not null,
  quantity numeric,
  note text,
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade
);

create table public.job_assignments (
  company_id uuid not null,
  job_id uuid not null,
  member_id uuid not null,
  is_lead boolean not null default false,
  primary key (job_id, member_id),
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade,
  foreign key (member_id, company_id) references public.members (id, company_id) on delete cascade
);
create index on public.job_assignments (member_id);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  job_id uuid not null,
  label text not null,
  position int not null default 0,
  done boolean not null default false,
  done_by uuid,
  done_at timestamptz,
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade,
  foreign key (done_by, company_id) references public.members (id, company_id)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  job_id uuid not null,
  category public.incident_category not null,
  urgency public.incident_urgency not null,
  comment text,
  reported_by uuid not null,
  reported_at timestamptz not null default now(),
  decision public.incident_decision,
  manager_message text,
  decided_by uuid,
  decided_at timestamptz,
  unique (id, company_id),
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade,
  foreign key (reported_by, company_id) references public.members (id, company_id),
  foreign key (decided_by, company_id) references public.members (id, company_id)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  job_id uuid not null,
  incident_id uuid,
  kind public.photo_kind not null,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  taken_by uuid,
  include_in_report boolean not null default true,
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade,
  foreign key (incident_id, company_id) references public.incidents (id, company_id) on delete set null (incident_id),
  foreign key (taken_by, company_id) references public.members (id, company_id)
);

create table public.job_events (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  job_id uuid not null,
  type text not null,
  actor_id uuid,
  at timestamptz not null default now(),
  data jsonb not null default '{}',
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade
);
create index on public.job_events (job_id, at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  job_id uuid not null unique,
  summary text,
  reservations text,
  pdf_path text,
  generated_at timestamptz,
  last_sent_at timestamptz,
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  member_id uuid not null,
  type text not null,
  job_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (member_id, company_id) references public.members (id, company_id) on delete cascade,
  foreign key (job_id, company_id) references public.jobs (id, company_id) on delete cascade
);
create index on public.notifications (member_id, read);
