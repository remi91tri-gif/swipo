"use server";

import { headers } from "next/headers";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; ok?: boolean };

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/** Envoie le lien pour choisir un nouveau mot de passe. La réponse est la même que le compte existe ou non. */
export async function requestPasswordReset(email: string): Promise<Result> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: "Saisissez une adresse e-mail valide." };
  if (isDemo) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(e, {
    redirectTo: `${await origin()}/auth/confirmer?next=/nouveau-mot-de-passe`,
  });
  if (error) {
    if (/rate limit|too many|seconds/i.test(error.message)) return { error: "Un e-mail vient déjà d'être envoyé. Patientez une minute avant de réessayer." };
    console.error("mot de passe oublié", error);
    return { error: "L'e-mail n'a pas pu être envoyé. Réessayez dans un instant." };
  }
  return { ok: true };
}

/** Enregistre le nouveau mot de passe (l'utilisateur vient de cliquer sur le lien reçu). */
export async function setNewPassword(next: string, confirm: string): Promise<{ error?: string; url?: string }> {
  if (next.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (next !== confirm) return { error: "Les deux mots de passe ne sont pas identiques." };
  if (isDemo) return { url: "/aujourdhui" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Le lien a expiré. Demandez-en un nouveau." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (/same|different/i.test(error.message)) return { error: "Choisissez un mot de passe différent de l'ancien." };
    if (/weak|short|characters/i.test(error.message)) return { error: "Ce mot de passe est trop simple. Choisissez-en un plus long." };
    return { error: "Le mot de passe n'a pas pu être changé. Réessayez dans un instant." };
  }
  return { url: "/aujourdhui" };
}
