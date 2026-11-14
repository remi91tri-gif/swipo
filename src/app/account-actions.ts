"use server";

import { getAgentSession, getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { stripe, stripeEnabled } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; url?: string };
const DEMO: Result = { error: "Mode démonstration : rien n'est supprimé." };

type Sb = Awaited<ReturnType<typeof createClient>>;

/** Supprime tous les fichiers d'un dossier du stockage (photos, logo, photos de profil). */
async function emptyFolder(supabase: Sb, bucket: string, folder: string) {
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase.storage.from(bucket).list(folder, { limit: 100 });
    const files = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (!files.length) return;
    const { error } = await supabase.storage.from(bucket).remove(files);
    if (error) return;
  }
}

/**
 * Gérant : supprime définitivement l'entreprise, ses chantiers, photos, clients, l'équipe et les comptes.
 * L'abonnement éventuel est arrêté tout de suite, sans nouveau prélèvement.
 */
export async function deleteMyCompany(confirmName: string): Promise<Result> {
  if (isDemo) return DEMO;
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Réservé au gérant." };
  const companyId = session.company.id;
  if (confirmName.trim().toLowerCase() !== session.company.name.trim().toLowerCase()) {
    return { error: "Le nom saisi ne correspond pas à celui de votre entreprise." };
  }
  const supabase = await createClient();

  // 1. Abonnement : arrêt immédiat et suppression du client chez Stripe.
  const { data: c } = await supabase.from("companies").select("stripe_customer_id, stripe_subscription_id").eq("id", companyId).single();
  if (stripeEnabled && (c?.stripe_customer_id || c?.stripe_subscription_id)) {
    try {
      if (c.stripe_subscription_id) await stripe().subscriptions.cancel(c.stripe_subscription_id).catch(() => null);
      if (c.stripe_customer_id) await stripe().customers.del(c.stripe_customer_id);
    } catch (e) {
      console.error("suppression stripe", e);
      return { error: "L'abonnement n'a pas pu être arrêté. Réessayez dans un instant." };
    }
  }

  // 2. Fichiers : photos de chantier, logo, photos de profil.
  const [{ data: jobs }, { data: members }] = await Promise.all([
    supabase.from("jobs").select("id").eq("company_id", companyId),
    supabase.from("members").select("id").eq("company_id", companyId),
  ]);
  for (const j of jobs ?? []) await emptyFolder(supabase, "photos", `${companyId}/${j.id}`);
  await emptyFolder(supabase, "logos", companyId);
  for (const m of members ?? []) await emptyFolder(supabase, "avatars", `${companyId}/${m.id}`);

  // 3. Données et comptes.
  const { error } = await supabase.rpc("delete_my_company", { p_confirm: confirmName });
  if (error) {
    console.error("suppression entreprise", error);
    return { error: error.code === "22023" ? "Le nom saisi ne correspond pas à celui de votre entreprise." : "La suppression n'a pas abouti. Réessayez dans un instant." };
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => null);
  return { url: "/" };
}

/** Agent ou chef d'équipe : supprime son propre compte. Ses chantiers passés restent à l'entreprise. */
export async function deleteMyAccount(): Promise<Result> {
  if (isDemo) return DEMO;
  const session = await getAgentSession();
  if (!session) return { error: "Session expirée." };
  if (session.member.role === "gerant") return { error: "Un gérant supprime son compte depuis Paramètres." };
  const supabase = await createClient();
  await emptyFolder(supabase, "avatars", `${session.company.id}/${session.member.id}`);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("suppression compte", error);
    return { error: "La suppression n'a pas abouti. Réessayez dans un instant." };
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => null);
  return { url: "/" };
}
