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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authError(error.message), fields: { email } };
  redirect("/aujourdhui");
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

// --- Agent : connexion par code SMS ------------------------------------------

export async function sendAgentCode(_: FormState, fd: FormData): Promise<FormState> {
  const raw = text(fd, "phone");
  if (!isValidFrenchMobile(raw)) return { error: "Saisissez un numéro de portable (06 ou 07).", fields: { phone: raw } };
  const phone = toE164(raw);
  if (isDemo) return { step: "code", phone };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
  if (error) return { error: authError(error.message), fields: { phone: raw } };
  return { step: "code", phone };
}

export async function verifyAgentCode(_: FormState, fd: FormData): Promise<FormState> {
  const phone = text(fd, "phone");
  const token = text(fd, "code").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Le code reçu par SMS contient 6 chiffres.", step: "code", phone };
  if (isDemo) redirect("/agent");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { error: authError(error.message), step: "code", phone };
  const { data: linked } = await supabase.rpc("claim_invitation");
  if (!linked) {
    const { data: me } = await supabase.from("members").select("id").limit(1);
    if (!me?.length) {
      await supabase.auth.signOut();
      return { error: "Ce numéro n'est rattaché à aucune entreprise. Demandez à votre gérant de vous ajouter à l'équipe." };
    }
  }
  redirect("/agent");
}
