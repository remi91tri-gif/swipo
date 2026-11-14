import "server-only";
import { isDemo } from "./env";
import { demoMembers } from "./demo";
import { createClient } from "./supabase/server";
import type { JobStatus, Session } from "./types";

export type PhotoKind = "avant" | "apres" | "probleme" | "reference" | "autre";
export type MissionPhoto = { id: string; kind: PhotoKind; url: string | null };

export type AgentMissionDetail = {
  id: string;
  companyId: string;
  title: string;
  status: JobStatus;
  date: string | null;
  startTime: string | null;
  address: string;
  accessInfo: string | null;
  onsiteContact: string | null;
  instructions: string | null;
  photosRequired: boolean;
  checklist: { id: string; label: string; done: boolean }[];
  teammates: string[];
  photos: MissionPhoto[];
  myMemberId: string;
  startedAt: string | null;
  finishedAt: string | null;
  openIncident: { category: string; decision: string | null; message: string | null } | null;
  reworkReason: string | null;
};

/** Liens temporaires (1 h) vers des photos privées. */
export async function signedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (isDemo || paths.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("photos").createSignedUrls(paths, 3600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}

export async function getAgentMission(session: Session, id: string): Promise<AgentMissionDetail | null> {
  if (isDemo) {
    return {
      id,
      companyId: session.company.id,
      title: "Remise en état après locataire",
      status: "planifie",
      date: null,
      startTime: "08:00",
      address: "27 rue Barla, 06300 Nice",
      accessInfo: "Boîte à clés 1906, 2e étage gauche",
      onsiteContact: null,
      instructions: "Le propriétaire passe à 12 h pour l'état des lieux. Priorité cuisine et salle de bain.",
      photosRequired: true,
      checklist: ["Cuisine et électroménager", "Salle de bain et sanitaires", "Sols et plinthes"].map((label, i) => ({ id: `k${i}`, label, done: false })),
      teammates: [demoMembers[2].firstName],
      photos: [],
      myMemberId: session.member.id,
      startedAt: null,
      finishedAt: null,
      openIncident: null,
      reworkReason: null,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, status, scheduled_date, start_time, instructions, photos_after_required, started_at, finished_at, sites(address, access_info, onsite_contact), checklist_items(id, label, done, position), job_assignments(member_id), photos(id, kind, storage_path, taken_at), incidents(category, urgency, decision, manager_message, reported_at), job_events(type, at, data)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  type Row = {
    id: string;
    company_id: string;
    title: string;
    status: JobStatus;
    scheduled_date: string | null;
    start_time: string | null;
    instructions: string | null;
    photos_after_required: boolean;
    started_at: string | null;
    finished_at: string | null;
    sites: { address: string; access_info: string | null; onsite_contact: string | null } | null;
    checklist_items: { id: string; label: string; done: boolean; position: number }[];
    job_assignments: { member_id: string }[];
    photos: { id: string; kind: PhotoKind; storage_path: string; taken_at: string }[];
    incidents: { category: string; urgency: string; decision: string | null; manager_message: string | null; reported_at: string }[];
    job_events: { type: string; at: string; data: Record<string, unknown> }[];
  };
  const r = data as unknown as Row;
  const photos = [...r.photos].sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const [{ data: people }, urls] = await Promise.all([
    supabase.from("members").select("id, first_name").eq("company_id", r.company_id),
    signedPhotoUrls(photos.map((p) => p.storage_path)),
  ]);
  const names = new Map((people ?? []).map((p) => [p.id as string, p.first_name as string]));
  const lastIncident = [...r.incidents].filter((i) => i.urgency === "bloquant").sort((a, b) => b.reported_at.localeCompare(a.reported_at))[0];

  return {
    id: r.id,
    companyId: r.company_id,
    title: r.title,
    status: r.status,
    date: r.scheduled_date,
    startTime: r.start_time,
    address: r.sites?.address ?? "",
    accessInfo: r.sites?.access_info ?? null,
    onsiteContact: r.sites?.onsite_contact ?? null,
    instructions: r.instructions,
    photosRequired: r.photos_after_required,
    checklist: [...r.checklist_items].sort((a, b) => a.position - b.position).map(({ id, label, done }) => ({ id, label, done })),
    teammates: r.job_assignments.filter((a) => a.member_id !== session.member.id).map((a) => names.get(a.member_id) ?? ""),
    photos: photos.map((p) => ({ id: p.id, kind: p.kind, url: urls.get(p.storage_path) ?? null })),
    myMemberId: session.member.id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    openIncident: lastIncident ? { category: lastIncident.category, decision: lastIncident.decision, message: lastIncident.manager_message } : null,
    reworkReason: (() => {
      const e = [...r.job_events].filter((x) => x.type === "reprise_demandee").sort((a, b) => b.at.localeCompare(a.at))[0];
      return e && typeof e.data?.motif === "string" ? e.data.motif : null;
    })(),
  };
}
