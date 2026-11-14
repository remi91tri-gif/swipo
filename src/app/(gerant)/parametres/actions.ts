"use server";

import { revalidatePath } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/data";
import { isDemo, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { saveBilling, stripe, stripeEnabled } from "@/lib/billing/stripe";

type Result = { error?: string; ok?: string };
const DEMO: Result = { error: "Mode démonstration : rien n'est enregistré." };

/** Nouveau mot de passe, après vérification du mot de passe actuel. */
export async function changePassword(current: string, next: string, confirm: string): Promise<Result> {
  if (isDemo) return DEMO;
  const session = await getSession();
  if (!session) return { error: "Session expirée. Reconnectez-vous." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email as string | undefined;
  if (!email) return { error: "Vous êtes connecté par lien : il n'y a pas de mot de passe sur ce compte." };
  if (next.length < 8) return { error: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  if (next !== confirm) return { error: "Les deux nouveaux mots de passe ne sont pas identiques." };
  if (next === current) return { error: "Le nouveau mot de passe doit être différent de l'actuel." };

  // Vérification du mot de passe actuel, sans toucher à la session en cours.
  const check = createPlainClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await check.auth.signInWithPassword({ email, password: current });
  if (wrong) return { error: "Le mot de passe actuel n'est pas le bon." };
  await check.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (/weak|short|characters/i.test(error.message)) return { error: "Ce mot de passe est trop simple. Choisissez-en un plus long." };
    return { error: "Le mot de passe n'a pas pu être changé. Réessayez dans un instant." };
  }
  return { ok: "Mot de passe changé." };
}

/** Coordonnées de l'entreprise (gérant). */
export async function updateCompany(input: { name: string; phone: string; address: string; siret: string }): Promise<Result> {
  if (isDemo) return DEMO;
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Réservé au gérant." };
  const name = input.name.trim();
  if (!name) return { error: "Indiquez le nom de l'entreprise." };
  const siret = input.siret.replace(/\s/g, "");
  if (siret && !/^\d{14}$/.test(siret)) return { error: "Le SIRET compte 14 chiffres." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ name, phone: input.phone.trim() || null, address: input.address.trim() || null, siret: siret || null })
    .eq("id", session.company.id);
  if (error) return { error: "Les informations n'ont pas pu être enregistrées." };
  revalidatePath("/", "layout");
  return { ok: "Informations enregistrées." };
}

/** Résilier (fin de la période payée) ou reprendre l'abonnement. */
export async function setCancelAtPeriodEnd(cancel: boolean): Promise<Result> {
  if (isDemo) return DEMO;
  if (!stripeEnabled) return { error: "Le paiement en ligne n'est pas activé." };
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Réservé au gérant." };
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("stripe_subscription_id").eq("id", session.company.id).single();
  const subId = data?.stripe_subscription_id as string | null;
  if (!subId) return { error: "Aucun abonnement en cours." };
  try {
    const sub = await stripe().subscriptions.update(subId, { cancel_at_period_end: cancel });
    await saveBilling({ company: session.company.id, subscription: sub });
  } catch (e) {
    console.error("résiliation", e);
    return { error: "L'opération n'a pas abouti. Réessayez dans un instant." };
  }
  revalidatePath("/", "layout");
  return { ok: cancel ? "Abonnement résilié : l'accès reste ouvert jusqu'à la fin de la période payée." : "Abonnement repris." };
}
