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
};

export type Company = {
  id: string;
  name: string;
};

export type Session = {
  company: Company;
  member: Member;
};

export type JobSummary = {
  id: string;
  title: string;
  clientName: string;
  city: string;
  startTime: string | null;
  status: JobStatus;
  team: Pick<Member, "id" | "firstName" | "lastName">[];
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
  member: Pick<Member, "id" | "firstName" | "lastName">;
  state: "en_cours" | "bloque" | "libre";
  detail: string;
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
