import "server-only";
import { isDemo } from "./env";
import { createClient } from "./supabase/server";
import { signedPhotoUrls } from "./data-agent";
import type { JobStatus, Session } from "./types";

export type ReportPhoto = { id: string; kind: "avant" | "apres"; path: string; url: string | null; included: boolean };

/** Ce que contient le compte rendu client : jamais de commentaires internes ni de noms d'agents. */
export type ClientReport = {
  jobId: string;
  status: JobStatus;
  title: string;
  services: string[];
  date: string | null;
  finishedAt: string | null;
  address: string;
  clientName: string;
  company: { id: string; name: string; phone: string | null; address: string | null; siret: string | null; logoPath: string | null; logoUrl: string | null };
  tasks: string[];
  photos: ReportPhoto[];
  summary: string;
  reservations: string;
  lastSentAt: string | null;
};

/** Un compte rendu se prépare une fois le chantier terminé. */
export const REPORTABLE: JobStatus[] = ["termine", "valide"];

export async function getClientReport(session: Session, jobId: string): Promise<ClientReport | null> {
  if (isDemo) {
    return {
      jobId,
      status: "termine",
      title: "Nettoyage de vitrine",
      services: ["Vitrerie"],
      date: new Date().toISOString().slice(0, 10),
      finishedAt: new Date().toISOString(),
      address: "4 quai Lunel, 06300 Nice",
      clientName: "Boulangerie du Port",
      company: { id: session.company.id, name: session.company.name, phone: null, address: null, siret: null, logoPath: null, logoUrl: null },
      tasks: ["Vitrine extérieure", "Vitrine intérieure", "Porte d'entrée et poignées"],
      photos: [],
      summary: "",
      reservations: "",
      lastSentAt: null,
    };
  }
  const supabase = await createClient();
  const [jobRes, companyRes, reportRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, status, scheduled_date, finished_at, clients(name), sites(address), job_services(label), checklist_items(label, done, position), photos(id, kind, storage_path, taken_at, include_in_report)")
      .eq("id", jobId)
      .eq("company_id", session.company.id)
      .maybeSingle(),
    supabase.from("companies").select("id, name, phone, address, siret, logo_path").eq("id", session.company.id).single(),
    supabase.from("reports").select("summary, reservations, last_sent_at").eq("job_id", jobId).maybeSingle(),
  ]);
  if (jobRes.error) throw jobRes.error;
  if (companyRes.error) throw companyRes.error;
  if (!jobRes.data) return null;

  type Row = {
    id: string;
    title: string;
    status: JobStatus;
    scheduled_date: string | null;
    finished_at: string | null;
    clients: { name: string } | null;
    sites: { address: string } | null;
    job_services: { label: string }[];
    checklist_items: { label: string; done: boolean; position: number }[];
    photos: { id: string; kind: string; storage_path: string; taken_at: string; include_in_report: boolean }[];
  };
  const r = jobRes.data as unknown as Row;
  const c = companyRes.data;
  const photos = r.photos
    .filter((p) => p.kind === "avant" || p.kind === "apres")
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const urls = await signedPhotoUrls(photos.map((p) => p.storage_path));
  const logoUrl = c.logo_path ? (await supabase.storage.from("logos").createSignedUrl(c.logo_path, 3600)).data?.signedUrl ?? null : null;

  return {
    jobId: r.id,
    status: r.status,
    title: r.title,
    services: r.job_services.map((s) => s.label),
    date: r.scheduled_date,
    finishedAt: r.finished_at,
    address: r.sites?.address ?? "",
    clientName: r.clients?.name ?? "",
    company: { id: c.id, name: c.name, phone: c.phone, address: c.address, siret: c.siret, logoPath: c.logo_path, logoUrl },
    tasks: [...r.checklist_items].sort((a, b) => a.position - b.position).filter((i) => i.done).map((i) => i.label),
    photos: photos.map((p) => ({ id: p.id, kind: p.kind as "avant" | "apres", path: p.storage_path, url: urls.get(p.storage_path) ?? null, included: p.include_in_report })),
    summary: reportRes.data?.summary ?? "",
    reservations: reportRes.data?.reservations ?? "",
    lastSentAt: reportRes.data?.last_sent_at ?? null,
  };
}
