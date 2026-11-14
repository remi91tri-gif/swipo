// Supprime les fichiers (photos, logo, photo de profil) de l'entreprise du compte de test, avant de supprimer l'entreprise en SQL.
// Usage : NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/nettoyage-stockage.mjs
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { error } = await sb.auth.signInWithPassword({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD });
if (error) throw error;
const { data: member } = await sb.from("members").select("company_id").limit(1).single();
const company = member.company_id;
let removed = 0;
const { data: logos } = await sb.storage.from("logos").list(company);
if (logos?.length) removed += (await sb.storage.from("logos").remove(logos.map((f) => `${company}/${f.name}`))).data?.length ?? 0;
const { data: jobs } = await sb.storage.from("photos").list(company);
for (const j of jobs ?? []) {
  const { data: files } = await sb.storage.from("photos").list(`${company}/${j.name}`);
  if (files?.length) removed += (await sb.storage.from("photos").remove(files.map((f) => `${company}/${j.name}/${f.name}`))).data?.length ?? 0;
}
// Photo de profil du compte connecté (chacun ne peut supprimer que la sienne : relancer avec le compte agent).
const { data: me } = await sb.from("members").select("avatar_path").eq("company_id", company).not("avatar_path", "is", null);
const mine = (me ?? []).map((m) => m.avatar_path);
if (mine.length) removed += (await sb.storage.from("avatars").remove(mine)).data?.length ?? 0;
console.log(`${removed} fichier(s) supprimé(s) pour l'entreprise ${company}`);
