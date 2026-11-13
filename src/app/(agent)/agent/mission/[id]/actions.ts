"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };
const DEMO: Result = { error: "Mode démonstration : rien n'est enregistré." };

function friendly(message: string) {
  // Les fonctions de la base renvoient déjà des messages en français pour les règles métier.
  if (/Il manque|ne peut pas|n'est pas|introuvable|affecté|clos|cours/i.test(message)) return message;
  return "L'action n'a pas abouti. Vérifiez votre connexion et réessayez.";
}

async function rpc(name: string, args: Record<string, unknown>, jobId: string): Promise<Result> {
  if (isDemo) return DEMO;
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/agent/mission/${jobId}`);
  revalidatePath("/agent");
  return {};
}

export async function startJob(jobId: string) {
  return rpc("start_job", { p_job: jobId }, jobId);
}

export async function setChecklistItem(jobId: string, itemId: string, done: boolean) {
  return rpc("set_checklist_item", { p_item: itemId, p_done: done }, jobId);
}

export async function finishJob(jobId: string, comment: string) {
  return rpc("finish_job", { p_job: jobId, p_comment: comment || null }, jobId);
}

/** Enregistre une photo déjà déposée dans le stockage par le navigateur. */
export async function registerPhoto(jobId: string, kind: "avant" | "apres" | "probleme", path: string, incidentId?: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Session expirée. Reconnectez-vous." };
  if (isDemo) return DEMO;
  if (!path.startsWith(`${session.company.id}/${jobId}/`)) return { error: "Photo refusée." };
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({
    company_id: session.company.id,
    job_id: jobId,
    kind,
    storage_path: path,
    taken_by: session.member.id,
    incident_id: incidentId ?? null,
  });
  if (error) return { error: "La photo n'a pas pu être enregistrée." };
  revalidatePath(`/agent/mission/${jobId}`);
  return {};
}

export async function reportIncident(
  jobId: string,
  category: string,
  urgency: "bloquant" | "information",
  comment: string,
  photoPath?: string,
): Promise<Result & { incidentId?: string }> {
  if (isDemo) return DEMO;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_incident", { p_job: jobId, p_category: category, p_urgency: urgency, p_comment: comment || null });
  if (error) return { error: friendly(error.message) };
  if (photoPath) await registerPhoto(jobId, "probleme", photoPath, data as string);
  revalidatePath(`/agent/mission/${jobId}`);
  revalidatePath("/agent");
  return { incidentId: data as string };
}
