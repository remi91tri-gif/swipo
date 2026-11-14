"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };
const DEMO: Result = { error: "Mode démonstration : rien n'est enregistré." };

async function manager() {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return null;
  return { session, supabase: await createClient() };
}

/** Enregistre le résumé, les réserves et le choix des photos du compte rendu client. */
export async function saveReport(jobId: string, summary: string, reservations: string, photoIds: string[], included: string[]): Promise<Result> {
  if (isDemo) return {};
  const m = await manager();
  if (!m) return { error: "Réservé au gérant." };
  const { session, supabase } = m;
  const keep = new Set(included);
  const on = photoIds.filter((id) => keep.has(id));
  const off = photoIds.filter((id) => !keep.has(id));
  const [rep, a, b] = await Promise.all([
    supabase
      .from("reports")
      .upsert({ company_id: session.company.id, job_id: jobId, summary: summary.trim() || null, reservations: reservations.trim() || null }, { onConflict: "job_id" }),
    on.length ? supabase.from("photos").update({ include_in_report: true }).in("id", on).eq("job_id", jobId) : Promise.resolve({ error: null }),
    off.length ? supabase.from("photos").update({ include_in_report: false }).in("id", off).eq("job_id", jobId) : Promise.resolve({ error: null }),
  ]);
  const error = rep.error ?? a.error ?? b.error;
  if (error) {
    console.error("saveReport", error);
    return { error: "Le compte rendu n'a pas pu être enregistré. Réessayez." };
  }
  return {};
}

/** Note la date d'envoi au client (téléchargement ou partage). */
export async function markReportSent(jobId: string): Promise<Result> {
  if (isDemo) return {};
  const m = await manager();
  if (!m) return { error: "Réservé au gérant." };
  const { error } = await m.supabase
    .from("reports")
    .upsert({ company_id: m.session.company.id, job_id: jobId, last_sent_at: new Date().toISOString() }, { onConflict: "job_id" });
  if (error) return { error: "La date d'envoi n'a pas été enregistrée." };
  revalidatePath(`/chantiers/${jobId}`);
  return {};
}

/** Enregistre le chemin du logo déposé dans le stockage (ou le retire). */
export async function setCompanyLogo(path: string | null): Promise<Result> {
  if (isDemo) return DEMO;
  const m = await manager();
  if (!m) return { error: "Réservé au gérant." };
  if (path && !path.startsWith(`${m.session.company.id}/`)) return { error: "Logo invalide." };
  const { data: old } = await m.supabase.from("companies").select("logo_path").eq("id", m.session.company.id).single();
  const { error } = await m.supabase.from("companies").update({ logo_path: path }).eq("id", m.session.company.id);
  if (error) return { error: "Le logo n'a pas pu être enregistré." };
  if (old?.logo_path && old.logo_path !== path) await m.supabase.storage.from("logos").remove([old.logo_path]);
  revalidatePath("/chantiers", "layout");
  return {};
}
