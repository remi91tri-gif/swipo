import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Supprime tous les fichiers d'un dossier du stockage. */
export async function emptyFolder(sb: SupabaseClient, bucket: string, folder: string) {
  for (let i = 0; i < 50; i++) {
    const { data } = await sb.storage.from(bucket).list(folder, { limit: 100 });
    const files = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (!files.length) return;
    const { error } = await sb.storage.from(bucket).remove(files);
    if (error) return;
  }
}

/** Tous les fichiers d'une entreprise : photos de chantier, logo, photos de profil. */
export async function removeCompanyFiles(sb: SupabaseClient, companyId: string) {
  const [{ data: jobs }, { data: members }] = await Promise.all([
    sb.from("jobs").select("id").eq("company_id", companyId),
    sb.from("members").select("id").eq("company_id", companyId),
  ]);
  for (const j of jobs ?? []) await emptyFolder(sb, "photos", `${companyId}/${j.id}`);
  await emptyFolder(sb, "logos", companyId);
  for (const m of members ?? []) await emptyFolder(sb, "avatars", `${companyId}/${m.id}`);
}
