export type MemberRole = "gerant" | "chef" | "agent";

export type JobStatus =
  | "a_planifier"
  | "planifie"
  | "en_cours"
  | "a_traiter"
  | "termine"
  | "a_reprendre"
  | "valide"
  | "annule";

export type Member = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  role: MemberRole;
  active: boolean;
  /** Vrai quand l'agent s'est déjà connecté au moins une fois. */
  hasAccount: boolean;
  /** Photo de profil, ou null (on affiche alors les initiales). */
  avatarUrl?: string | null;
};

export type Company = {
  id: string;
  name: string;
};

export type Access = "pilote" | "actif" | "essai" | "expire";

/** Abonnement de l'entreprise, lu avec la session (pas de requête en plus). */
export type Billing = {
  access: Access;
  plan: "starter" | "pro" | "business";
  status: string;
  trialEndsAt: string;
  pilotUntil: string | null;
  pilotDiscount: boolean;
  interval: "month" | "year" | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

export type Session = {
  company: Company;
  member: Member;
  billing: Billing;
};

export type JobSummary = {
  id: string;
  title: string;
  clientName: string;
  city: string;
  startTime: string | null;
  status: JobStatus;
  team: Pick<Member, "id" | "firstName" | "lastName" | "avatarUrl">[];
};

export type Blocker = {
  jobId: string;
  incidentId: string;
  jobTitle: string;
  place: string;
  reportedBy: string;
  reportedAt: string;
  comment: string | null;
};

export type ToVerify = {
  jobId: string;
  clientName: string;
  finishedAt: string;
  photoCount: number;
};

export type TeamNow = {
  member: Pick<Member, "id" | "firstName" | "lastName" | "avatarUrl">;
  state: "en_cours" | "bloque" | "libre";
  detail: string;
};

export type ClientType = "particulier" | "professionnel" | "syndic" | "agence";

export type Site = {
  id: string;
  address: string;
  accessInfo: string | null;
  onsiteContact: string | null;
  label: string | null;
};

export type Client = {
  id: string;
  name: string;
  type: ClientType;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  notes: string | null;
  sites: Site[];
};

export type JobListItem = {
  id: string;
  title: string;
  clientName: string;
  city: string;
  date: string | null;
  startTime: string | null;
  durationMin: number | null;
  status: JobStatus;
  team: Pick<Member, "id" | "firstName" | "lastName" | "avatarUrl">[];
};

export type JobEvent = { at: string; type: string; actor: string | null; data: Record<string, unknown> };

export type JobDetail = JobListItem & {
  clientId: string;
  siteId?: string | null;
  checklistRequired?: boolean;
  clientPhone: string | null;
  address: string;
  accessInfo: string | null;
  onsiteContact: string | null;
  instructions: string | null;
  photosRequired: boolean;
  checklist: { id: string; label: string; done: boolean }[];
  services: string[];
  events: JobEvent[];
  leadId: string | null;
  finishComment: string | null;
  photos: { id: string; kind: "avant" | "apres" | "probleme" | "reference" | "autre"; url: string | null; incidentId: string | null }[];
  incidents: JobIncident[];
  finishedAt: string | null;
  reworkReason: string | null;
};

export type IncidentDecision = "continuer" | "attendre" | "reprogrammer" | "ne_pas_effectuer";

export type JobIncident = {
  id: string;
  category: string;
  urgency: "bloquant" | "information";
  comment: string | null;
  reportedBy: string | null;
  reportedAt: string;
  decision: IncidentDecision | null;
  managerMessage: string | null;
  decidedAt: string | null;
};

export type PlanningDay = {
  date: string;
  rows: { member: Pick<Member, "id" | "firstName" | "lastName" | "role" | "avatarUrl">; jobs: JobListItem[] }[];
  unassigned: JobListItem[];
};

export type AgentMission = {
  id: string;
  title: string;
  address: string;
  startTime: string | null;
  status: JobStatus;
  teammates: string[];
};

export type AgentDay = {
  dateLabel: string;
  missions: AgentMission[];
};

export type Dashboard = {
  dateLabel: string;
  jobs: JobSummary[];
  blockers: Blocker[];
  toVerify: ToVerify[];
  teamNow: TeamNow[];
  counts: { prevus: number; enCours: number; aTraiter: number; aVerifier: number };
};
