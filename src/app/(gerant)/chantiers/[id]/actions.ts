"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { IncidentDecision } from "@/lib/types";

type Result = { error?: string };
const DEMO: Result = { error: "Mode démonstration : rien n'est enregistré." };

function refresh(jobId?: string) {
  if (jobId) revalidatePath(`/chantiers/${jobId}`);
  revalidatePath("/chantiers");
  revalidatePath("/aujourdhui");
  revalidatePath("/planning");
}

async function managerClient() {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return null;
  return createClient();
}

function friendly(message: string) {
  if (/Indiquez|Seul|Réservé|introuvable|terminé/i.test(message)) return message;
  return "L'action n'a pas abouti. Réessayez dans un instant.";
}

export async function decideIncident(jobId: string, incidentId: string, decision: IncidentDecision, message: string): Promise<Result> {
  if (isDemo) return DEMO;
  const supabase = await managerClient();
  if (!supabase) return { error: "Réservé au gérant." };
  const { error } = await supabase.rpc("decide_incident", { p_incident: incidentId, p_decision: decision, p_message: message.trim() || null });
  if (error) return { error: friendly(error.message) };
  refresh(jobId);
  return {};
}

export async function validateJobs(jobIds: string[]): Promise<Result & { count?: number }> {
  if (isDemo) return DEMO;
  const supabase = await managerClient();
  if (!supabase) return { error: "Réservé au gérant." };
  const { data, error } = await supabase.rpc("validate_jobs", { p_jobs: jobIds });
  if (error) return { error: friendly(error.message) };
  jobIds.forEach((id) => revalidatePath(`/chantiers/${id}`));
  refresh();
  return { count: data as number };
}

export async function requestRework(jobId: string, reason: string, date: string, time: string): Promise<Result> {
  if (!reason.trim()) return { error: "Indiquez ce qui doit être refait." };
  if (isDemo) return DEMO;
  const supabase = await managerClient();
  if (!supabase) return { error: "Réservé au gérant." };
  const { error } = await supabase.rpc("request_rework", { p_job: jobId, p_reason: reason.trim(), p_date: date || null, p_time: time || null, p_members: null });
  if (error) return { error: friendly(error.message) };
  refresh(jobId);
  return {};
}
