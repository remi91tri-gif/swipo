import "server-only";
import { isDemo } from "./env";
import { demoMembers } from "./demo";
import { createClient } from "./supabase/server";
import { signedPhotoUrls } from "./data-agent";
import type { Client, JobDetail, JobIncident, JobListItem, JobStatus, Member, PlanningDay, Session, Site } from "./types";

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

/** Date du jour à Nice, au format AAAA-MM-JJ. */
export function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function cityOf(address: string | null | undefined) {
  if (!address) return "";
  const part = address.split(",").pop()?.trim() ?? "";
  return part.replace(/^\d{5}\s*/, "");
}

type Person = Pick<Member, "id" | "firstName" | "lastName">;

async function peopleMap(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const { data } = await supabase.from("members").select("id, first_name, last_name, role, active").eq("company_id", companyId);
  return new Map((data ?? []).map((m) => [m.id as string, { id: m.id as string, firstName: m.first_name as string, lastName: m.last_name as string, role: m.role as Member["role"], active: m.active as boolean }]));
}

const JOB_LIST_COLUMNS = "id, title, scheduled_date, start_time, duration_min, status, clients(name), sites(address), job_assignments(member_id)";

type JobListRow = {
  id: string;
  title: string;
  scheduled_date: string | null;
  start_time: string | null;
  duration_min: number | null;
  status: JobStatus;
  clients: { name: string } | null;
  sites: { address: string } | null;
  job_assignments: { member_id: string }[];
};

function toListItem(r: JobListRow, people: Map<string, Person>): JobListItem {
  return {
    id: r.id,
    title: r.title,
    clientName: r.clients?.name ?? "",
    city: cityOf(r.sites?.address),
    date: r.scheduled_date,
    startTime: r.start_time,
    durationMin: r.duration_min,
    status: r.status,
    team: r.job_assignments.map((a) => people.get(a.member_id)).filter((p): p is Person => !!p),
  };
}

// ---------------------------------------------------------------------------
// Données de démonstration
// ---------------------------------------------------------------------------
const [, karim, lea, yanis] = demoMembers;
const p = (m: Member): Person => ({ id: m.id, firstName: m.firstName, lastName: m.lastName });

const DEMO_CLIENTS: Client[] = [
  { id: "c1", name: "Boulangerie du Port", type: "professionnel", phone: "+33493000000", email: "contact@boulangerie-port.fr", contactName: "M. Garcia", notes: null, sites: [{ id: "s1", address: "4 quai Lunel, 06300 Nice", accessInfo: "Clé de l'imposte sous le comptoir", onsiteContact: null, label: null }] },
  { id: "c2", name: "Agence Riviera Immobilier", type: "agence", phone: "+33493111111", email: null, contactName: "Sophie L.", notes: "Facturation mensuelle", sites: [{ id: "s2", address: "27 rue Barla, 06300 Nice", accessInfo: "Boîte à clés 1906, 2e étage gauche", onsiteContact: null, label: "Appartement Barla" }] },
  { id: "c3", name: "Villa Ferraro", type: "particulier", phone: "+33612345678", email: null, contactName: "M. et Mme Ferraro", notes: null, sites: [{ id: "s3", address: "Chemin des Pins, 06230 Villefranche-sur-Mer", accessInfo: "Portail : sonner à l'interphone", onsiteContact: "06 12 34 56 78", label: null }] },
  { id: "c4", name: "SCI Les Arcades", type: "professionnel", phone: null, email: "gestion@arcades.fr", contactName: null, notes: null, sites: [{ id: "s4", address: "Avenue Pierre Sauvaigo, 06700 Saint-Laurent-du-Var", accessInfo: null, onsiteContact: null, label: "Bureaux 2e étage" }] },
];

function demoJobs(): JobListItem[] {
  const d = parisToday();
  return [
    { id: "j1", title: "Vitrerie commerce", clientName: "Boulangerie du Port", city: "Nice", date: d, startTime: "07:00", durationMin: 60, status: "termine", team: [p(yanis)] },
    { id: "j2", title: "Remise en état après locataire", clientName: "Agence Riviera Immobilier", city: "Nice", date: d, startTime: "08:00", durationMin: 240, status: "en_cours", team: [p(karim), p(lea)] },
    { id: "j3", title: "Vitres intérieur et extérieur", clientName: "Villa Ferraro", city: "Villefranche-sur-Mer", date: d, startTime: "09:00", durationMin: 150, status: "a_traiter", team: [p(yanis)] },
    { id: "j4", title: "Fin de chantier bureaux", clientName: "SCI Les Arcades", city: "Saint-Laurent-du-Var", date: d, startTime: "13:30", durationMin: 240, status: "planifie", team: [p(karim), p(lea), p(yanis)] },
    { id: "j5", title: "Nettoyage après déménagement", clientName: "Mme Rossi", city: "Nice", date: d, startTime: "14:00", durationMin: 120, status: "a_planifier", team: [] },
  ];
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
type ClientRow = { id: string; name: string; type: Client["type"]; phone: string | null; email: string | null; contact_name: string | null; notes: string | null; sites: { id: string; address: string; access_info: string | null; onsite_contact: string | null; label: string | null }[] };

function toClient(c: ClientRow): Client {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    phone: c.phone,
    email: c.email,
    contactName: c.contact_name,
    notes: c.notes,
    sites: c.sites.map((s): Site => ({ id: s.id, address: s.address, accessInfo: s.access_info, onsiteContact: s.onsite_contact, label: s.label })),
  };
}

export async function getClients(session: Session): Promise<Client[]> {
  if (isDemo) return DEMO_CLIENTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, type, phone, email, contact_name, notes, sites(id, address, access_info, onsite_contact, label)")
    .eq("company_id", session.company.id)
    .order("name");
  if (error) throw error;
  return (data as unknown as ClientRow[]).map(toClient);
}

export async function getClientWithJobs(session: Session, id: string): Promise<{ client: Client; jobs: JobListItem[] } | null> {
  if (isDemo) {
    const client = DEMO_CLIENTS.find((c) => c.id === id);
    return client ? { client, jobs: demoJobs().filter((j) => j.clientName === client.name) } : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, type, phone, email, contact_name, notes, sites(id, address, access_info, onsite_contact, label)")
    .eq("company_id", session.company.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [jobsRes, people] = await Promise.all([
    supabase.from("jobs").select(JOB_LIST_COLUMNS).eq("client_id", id).order("scheduled_date", { ascending: false, nullsFirst: true }).limit(50),
    peopleMap(supabase, session.company.id),
  ]);
  if (jobsRes.error) throw jobsRes.error;
  return { client: toClient(data as unknown as ClientRow), jobs: (jobsRes.data as unknown as JobListRow[]).map((r) => toListItem(r, people)) };
}

// ---------------------------------------------------------------------------
// Chantiers
// ---------------------------------------------------------------------------
export const JOB_TABS = [
  { id: "a-venir", label: "À venir", statuses: ["a_planifier", "planifie", "a_reprendre"] as JobStatus[] },
  { id: "en-cours", label: "En cours", statuses: ["en_cours", "a_traiter"] as JobStatus[] },
  { id: "a-verifier", label: "À vérifier", statuses: ["termine"] as JobStatus[] },
  { id: "historique", label: "Historique", statuses: ["valide", "annule"] as JobStatus[] },
] as const;
export type JobTab = (typeof JOB_TABS)[number]["id"];

export async function getJobs(session: Session, tab: JobTab): Promise<JobListItem[]> {
  const statuses = JOB_TABS.find((t) => t.id === tab)!.statuses;
  if (isDemo) return demoJobs().filter((j) => statuses.includes(j.status));
  const supabase = await createClient();
  const asc = tab === "a-venir";
  const [res, people] = await Promise.all([
    supabase
      .from("jobs")
      .select(JOB_LIST_COLUMNS)
      .eq("company_id", session.company.id)
      .in("status", statuses)
      .order("scheduled_date", { ascending: asc, nullsFirst: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(200),
    peopleMap(supabase, session.company.id),
  ]);
  if (res.error) throw res.error;
  return (res.data as unknown as JobListRow[]).map((r) => toListItem(r, people));
}

export async function getJob(session: Session, id: string): Promise<JobDetail | null> {
  if (isDemo) {
    const base = demoJobs().find((j) => j.id === id) ?? demoJobs()[0];
    const client = DEMO_CLIENTS.find((c) => c.name === base.clientName);
    return {
      ...base,
      clientId: client?.id ?? "c1",
      clientPhone: client?.phone ?? null,
      address: client?.sites[0]?.address ?? "Nice",
      accessInfo: client?.sites[0]?.accessInfo ?? null,
      onsiteContact: client?.sites[0]?.onsiteContact ?? null,
      instructions: "Passer avant l'ouverture de 8 h. Clé de l'imposte sous le comptoir.",
      photosRequired: true,
      checklist: [
        { id: "k1", label: "Vitrine extérieure", done: true },
        { id: "k2", label: "Vitrine intérieure", done: true },
        { id: "k3", label: "Porte d'entrée et poignées", done: base.status === "termine" },
      ],
      services: ["Vitrerie"],
      events: [
        { at: new Date().toISOString(), type: "cree", actor: "Marc", data: {} },
        { at: new Date().toISOString(), type: "demarre", actor: base.team[0]?.firstName ?? null, data: {} },
      ],
      leadId: base.team[0]?.id ?? null,
      finishComment: base.status === "termine" ? "Calcaire tenace en bas de la vitrine côté quai." : null,
      photos: [],
      incidents:
        base.status === "a_traiter"
          ? [{ id: "i1", category: "acces_impossible", urgency: "bloquant", comment: "Portail fermé, personne ne répond à l'interphone. J'attends devant.", reportedBy: base.team[0]?.firstName ?? null, reportedAt: new Date().toISOString(), decision: null, managerMessage: null, decidedAt: null }]
          : [],
      finishedAt: base.status === "termine" ? new Date().toISOString() : null,
      reworkReason: null,
    };
  }
  const supabase = await createClient();
  const peoplePromise = peopleMap(supabase, session.company.id);
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, client_id, title, scheduled_date, start_time, duration_min, status, instructions, photos_after_required, finish_comment, clients(name, phone), sites(address, access_info, onsite_contact), job_assignments(member_id, is_lead), checklist_items(id, label, done, position), job_services(label), job_events(at, type, actor_id, data), photos(id, kind, storage_path, taken_at, incident_id), incidents(id, category, urgency, comment, reported_by, reported_at, decision, manager_message, decided_at), finished_at",
    )
    .eq("company_id", session.company.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const people = await peoplePromise;
  type Row = Omit<JobListRow, "job_assignments" | "clients" | "sites"> & {
    client_id: string;
    instructions: string | null;
    photos_after_required: boolean;
    finish_comment: string | null;
    clients: { name: string; phone: string | null } | null;
    sites: { address: string; access_info: string | null; onsite_contact: string | null } | null;
    job_assignments: { member_id: string; is_lead: boolean }[];
    checklist_items: { id: string; label: string; done: boolean; position: number }[];
    job_services: { label: string }[];
    job_events: { at: string; type: string; actor_id: string | null; data: Record<string, unknown> }[];
    photos: { id: string; kind: JobDetail["photos"][number]["kind"]; storage_path: string; taken_at: string; incident_id: string | null }[];
    incidents: { id: string; category: string; urgency: JobIncident["urgency"]; comment: string | null; reported_by: string; reported_at: string; decision: JobIncident["decision"]; manager_message: string | null; decided_at: string | null }[];
    finished_at: string | null;
  };
  const r = data as unknown as Row;
  const photos = [...r.photos].sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const urls = await signedPhotoUrls(photos.map((ph) => ph.storage_path));
  return {
    ...toListItem(r, people),
    clientId: r.client_id,
    clientPhone: r.clients?.phone ?? null,
    address: r.sites?.address ?? "",
    accessInfo: r.sites?.access_info ?? null,
    onsiteContact: r.sites?.onsite_contact ?? null,
    instructions: r.instructions,
    photosRequired: r.photos_after_required,
    checklist: [...r.checklist_items].sort((a, b) => a.position - b.position).map(({ id, label, done }) => ({ id, label, done })),
    services: r.job_services.map((s) => s.label),
    events: [...r.job_events]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((e) => ({ at: e.at, type: e.type, actor: e.actor_id ? (people.get(e.actor_id)?.firstName ?? null) : null, data: e.data })),
    leadId: r.job_assignments.find((a) => a.is_lead)?.member_id ?? null,
    finishComment: r.finish_comment,
    photos: photos.map((ph) => ({ id: ph.id, kind: ph.kind, url: urls.get(ph.storage_path) ?? null, incidentId: ph.incident_id })),
    incidents: [...r.incidents]
      .sort((a, b) => b.reported_at.localeCompare(a.reported_at))
      .map((i) => ({
        id: i.id,
        category: i.category,
        urgency: i.urgency,
        comment: i.comment,
        reportedBy: people.get(i.reported_by)?.firstName ?? null,
        reportedAt: i.reported_at,
        decision: i.decision,
        managerMessage: i.manager_message,
        decidedAt: i.decided_at,
      })),
    finishedAt: r.finished_at,
    reworkReason: lastRework(r.job_events),
  };
}

/** Motif de la dernière demande de reprise, s'il y en a une. */
function lastRework(events: { at: string; type: string; data: Record<string, unknown> }[]) {
  const e = [...events].filter((x) => x.type === "reprise_demandee").sort((a, b) => b.at.localeCompare(a.at))[0];
  return e && typeof e.data?.motif === "string" ? e.data.motif : null;
}

// ---------------------------------------------------------------------------
// Planning du jour
// ---------------------------------------------------------------------------
export async function getPlanning(session: Session, date: string): Promise<PlanningDay> {
  let jobs: JobListItem[];
  let members: { id: string; firstName: string; lastName: string; role: Member["role"] }[];
  if (isDemo) {
    jobs = date === parisToday() ? demoJobs() : [];
    members = demoMembers.map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, role: m.role }));
  } else {
    const supabase = await createClient();
    const [res, people] = await Promise.all([
      supabase.from("jobs").select(JOB_LIST_COLUMNS).eq("company_id", session.company.id).eq("scheduled_date", date).neq("status", "annule").order("start_time", { nullsFirst: false }),
      peopleMap(supabase, session.company.id),
    ]);
    if (res.error) throw res.error;
    jobs = (res.data as unknown as JobListRow[]).map((r) => toListItem(r, people));
    members = [...people.values()].filter((m) => m.active).map(({ id, firstName, lastName, role }) => ({ id, firstName, lastName, role }));
  }
  const rows = members
    .map((member) => ({ member, jobs: jobs.filter((j) => j.team.some((t) => t.id === member.id)) }))
    .filter((r) => r.member.role !== "gerant" || r.jobs.length > 0)
    .sort((a, b) => a.member.firstName.localeCompare(b.member.firstName, "fr"));
  return { date, rows, unassigned: jobs.filter((j) => j.team.length === 0) };
}

/** Agents déjà occupés sur un créneau (avertissement, jamais un blocage). */
export async function getConflicts(session: Session, date: string, time: string, durationMin: number, memberIds: string[]) {
  if (!date || !time || memberIds.length === 0) return [];
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const start = toMin(time);
  const end = start + (durationMin || 60);
  const day = isDemo ? (date === parisToday() ? demoJobs() : []) : (await getPlanning(session, date)).rows.flatMap((r) => r.jobs);
  const out: { member: string; job: string; slot: string }[] = [];
  const seen = new Set<string>();
  for (const j of day) {
    if (!j.startTime || ["annule", "valide", "termine"].includes(j.status)) continue;
    const s = toMin(j.startTime);
    const e = s + (j.durationMin ?? 60);
    if (s >= end || e <= start) continue;
    for (const t of j.team) {
      const key = t.id + j.id;
      if (memberIds.includes(t.id) && !seen.has(key)) {
        seen.add(key);
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        out.push({ member: t.firstName, job: `${j.title} · ${j.clientName}`, slot: `${fmt(s)} à ${fmt(e)}` });
      }
    }
  }
  return out;
}
