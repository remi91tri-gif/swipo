"use server";

import { isDemo } from "@/lib/env";
import { adminClient, adminEnabled } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * L'agent choisit son e-mail et son mot de passe à partir de son lien d'invitation.
 * Le compte est marqué « agent » côté serveur (l'agent ne peut pas modifier cette marque) :
 * il ne donne accès qu'à l'espace agent.
 */
export async function joinWithAccount(token: string, rawEmail: string, password: string, confirm: string): Promise<{ error?: string; url?: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Saisissez une adresse e-mail valide." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne sont pas identiques." };
  if (isDemo) return { url: "/agent" };
  if (!adminEnabled) return { error: "La création d'accès n'est pas encore activée. Utilisez « Continuer sans e-mail »." };

  const supabase = await createClient();
  const { data: info } = await supabase.rpc("invite_info", { p_token: token });
  if (!(info as unknown[] | null)?.length) return { error: "Ce lien n'est plus valable. Demandez-en un nouveau à votre gérant." };

  const admin = adminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { swipo_espace: "agent" },
  });
  if (error || !created.user) {
    if (/already|registered|exists/i.test(error?.message ?? "")) return { error: "Un compte existe déjà avec cet e-mail. Utilisez une autre adresse, ou connectez-vous." };
    if (/password|weak/i.test(error?.message ?? "")) return { error: "Ce mot de passe est trop simple. Choisissez-en un plus long." };
    console.error("création accès agent", error);
    return { error: "L'accès n'a pas pu être créé. Réessayez." };
  }
  const { error: claimErr } = await admin.rpc("claim_invite_for", { p_token: token, p_user: created.user.id });
  if (claimErr) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => null);
    return { error: /plus valable|gérant/.test(claimErr.message) ? claimErr.message : "Le lien n'a pas pu être utilisé. Réessayez." };
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => null);
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) return { url: "/agent/connexion" };
  return { url: "/agent" };
}
