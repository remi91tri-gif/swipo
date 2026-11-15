import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Accès « administrateur » à Supabase (clé secrète, côté serveur uniquement).
 * Sert à inviter un gérant par e-mail et au nettoyage automatique des données.
 */
export const adminEnabled = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
