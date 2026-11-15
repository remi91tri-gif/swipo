"use server";

import { addressError, fullAddress, readAddress } from "@/lib/address";
import { getSession } from "@/lib/data";
import { getConflicts } from "@/lib/data-jobs";
import { isDemo } from "@/lib/env";
import { toE164 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type JobFormState = { error?: string; url?: string } | undefined;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createJobAction(prev: JobFormState, fd: FormData): Promise<JobFormState> {
  return saveJob(prev, fd);
}

/** Même formulaire que la création, avec l'identifiant du chantier à modifier. */
export async function updateJobAction(prev: JobFormState, fd: FormData): Promise<JobFormState> {
  return saveJob(prev, fd);
}

async function saveJob(_: JobFormState, fd: FormData): Promise<JobFormState> {
  const jobId = s(fd, "job_id");
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: `Seul le gérant peut ${jobId ? "modifier" : "créer"} un chantier.` };

  const clientId = s(fd, "client_id");
  const siteId = s(fd, "site_id");
  const title = s(fd, "title");
  const members = fd.getAll("members").map(String).filter(Boolean);
  const lead = s(fd, "lead") || members[0] || null;
  const checklistOn = fd.get("checklist_on") === "on";
  const checklist = checklistOn ? s(fd, "checklist").split("\n").map((l) => l.trim()).filter(Boolean) : [];
  const duration = Number(s(fd, "duration")) || null;

  if (!title) return { error: "Indiquez la prestation." };
  if (clientId === "new" && !s(fd, "new_client_name")) return { error: "Indiquez le nom du nouveau client." };
  if (!clientId) return { error: "Choisissez un client." };
  const a = readAddress(fd, "new_");
  if (siteId === "new" || !siteId) {
    const bad = addressError(a);
    if (bad) return { error: bad };
  }
  if (isDemo) return { error: "Mode démonstration : le chantier n'est pas enregistré." };

  const phone = s(fd, "new_client_phone");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(jobId ? "update_job" : "create_job", {
    ...(jobId ? { p_job: jobId } : {}),
    p_title: title,
    p_trade: s(fd, "trade_label"),
    p_client: clientId === "new" ? null : clientId,
    p_new_client: clientId === "new" ? { name: s(fd, "new_client_name"), type: s(fd, "new_client_type") || "particulier", phone: phone ? toE164(phone) : "" } : null,
    p_site: siteId && siteId !== "new" ? siteId : null,
    p_new_site: !siteId || siteId === "new" ? { address: fullAddress(a.street, a.postalCode, a.city), access_info: s(fd, "new_access") } : null,
    p_date: s(fd, "date") || null,
    p_time: s(fd, "time") || null,
    p_duration: duration,
    p_instructions: s(fd, "instructions") || null,
    p_photos_required: fd.get("photos_on") === "on",
    p_checklist: checklist,
    p_members: members,
    p_lead: lead,
  });
  if (error) {
    if (error.code === "22023" || error.code === "42501" || error.code === "P0002") return { error: error.message };
    if (/Votre offre comprend/.test(error.message)) return { error: error.message };
    return { error: `Le chantier n'a pas pu être ${jobId ? "modifié" : "créé"}. Réessayez.` };
  }
  // Le formulaire ouvre lui-même la fiche (une redirection depuis l'action pouvait laisser
  // le bouton bloqué sur « Création… »). Les pages de l'espace gérant sont recalculées à chaque visite.
  return { url: `/chantiers/${data}?${jobId ? "modifie" : "cree"}=1` };
}

export async function checkConflicts(date: string, time: string, duration: number, memberIds: string[]) {
  const session = await getSession();
  if (!session) return [];
  return getConflicts(session, date, time, duration, memberIds);
}
