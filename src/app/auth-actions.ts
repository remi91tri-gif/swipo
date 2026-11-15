"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { TRADES, isValidFrenchMobile, toE164 } from "@/lib/format";

export type FormState = { error?: string; fields?: Record<string, string>; step?: "code"; phone?: string } | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function authError(message: string) {
  if (/invalid login credentials/i.test(message)) return "E-mail ou mot de passe incorrect.";
  if (/already registered|already been registered/i.test(message)) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
  if (/password/i.test(message) && /least|short|weak/i.test(message)) return "Le mot de passe doit faire au moins 8 caractères.";
  if (/rate limit|too many/i.test(message)) return "Trop de tentatives. Patientez une minute puis réessayez.";
  if (/token|otp|expired|invalid/i.test(message)) return "Code incorrect ou expiré. Demandez un nouveau code.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}

// --- Gérant ------------------------------------------------------------------

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const email = text(fd, "email");
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Saisissez votre e-mail et votre mot de passe.", fields: { email } };
  if (isDemo) redirect("/aujourdhui");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authError(error.message), fields: { email } };
  const isAgentAccount = data.user?.app_metadata?.swipo_espace === "agent";

  // Page de connexion gérant : un compte d'agent ou de chef d'équipe n'y est pas reconnu.
  // On le déconnecte aussitôt et on répond comme pour des identifiants inconnus.
  if (text(fd, "espace") !== "agent") {
    let refused = isAgentAccount;
    if (!refused) {
      const { data: roles } = await supabase.from("members").select("role").eq("user_id", data.user.id).eq("active", true);
      refused = !!roles?.length && !roles.some((r) => r.role === "gerant");
    }
    if (refused) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "E-mail ou mot de passe incorrect.", fields: { email } };
    }
    redirect("/aujourdhui");
  }
  redirect(isAgentAccount ? "/agent" : "/aujourdhui");
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const fields = {
    first_name: text(fd, "first_name"),
    last_name: text(fd, "last_name"),
    company_name: text(fd, "company_name"),
    phone: text(fd, "phone"),
    email: text(fd, "email"),
  };
  const password = String(fd.get("password") ?? "");
  const trades = fd.getAll("trades").map(String).filter((t) => TRADES.some((x) => x.id === t));

  if (!fields.first_name || !fields.company_name || !fields.email) {
    return { error: "Prénom, nom de l'entreprise et e-mail sont nécessaires.", fields };
  }
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères.", fields };
  if (fields.phone && !isValidFrenchMobile(fields.phone)) {
    return { error: "Le numéro de portable doit commencer par 06 ou 07.", fields };
  }
  if (isDemo) redirect("/aujourdhui");

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const { data, error } = await supabase.auth.signUp({
    email: fields.email,
    password,
    // L'entreprise est créée à la première connexion (voir getSession), même si
    // la confirmation de l'e-mail est demandée avant.
    options: {
      // Le lien de l'e-mail confirme l'adresse puis ramène sur la page de connexion.
      emailRedirectTo: `${origin}/connexion?confirme=1`,
      data: { ...fields, phone: fields.phone ? toE164(fields.phone) : null, trades },
    },
  });
  if (error) return { error: authError(error.message), fields };
  if (!data.session) redirect("/connexion?confirmer=1");
  redirect("/aujourdhui");
}

export async function signOut() {
  if (!isDemo) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/connexion");
}
