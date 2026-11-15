"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { isValidFrenchMobile, toE164 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { adminClient, adminEnabled } from "@/lib/supabase/admin";
import { SITE_URL, emailEnabled, emailLayout, sendEmail } from "@/lib/email";
import type { Member, MemberRole } from "@/lib/types";

export type AddMemberState = { error?: string; added?: Member; fields?: Record<string, string> } | undefined;

export async function addMember(_: AddMemberState, fd: FormData): Promise<AddMemberState> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut ajouter un salarié." };

  const fields = {
    first_name: String(fd.get("first_name") ?? "").trim(),
    last_name: String(fd.get("last_name") ?? "").trim(),
    phone: String(fd.get("phone") ?? "").trim(),
    role: String(fd.get("role") ?? "agent"),
  };
  const role: MemberRole = fields.role === "chef" ? "chef" : fields.role === "gerant" ? "gerant" : "agent";
  if (!fields.first_name) return { error: "Indiquez le prénom.", fields };
  if (!isValidFrenchMobile(fields.phone)) return { error: "Le portable doit commencer par 06 ou 07 : c'est lui qui sert à se connecter.", fields };
  const phone = toE164(fields.phone);

  if (isDemo) {
    return {
      added: { id: `demo-${Date.now()}`, companyId: session.company.id, firstName: fields.first_name, lastName: fields.last_name, phone, email: null, role, active: true, hasAccount: false },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .insert({ company_id: session.company.id, first_name: fields.first_name, last_name: fields.last_name, phone, role, invited_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Ce numéro est déjà dans votre équipe.", fields };
    if (/Votre offre comprend/.test(error.message)) return { error: error.message, fields };
    return { error: "L'ajout n'a pas abouti. Réessayez dans un instant.", fields };
  }
  revalidatePath("/equipe");
  return {
    added: { id: data.id, companyId: session.company.id, firstName: fields.first_name, lastName: fields.last_name, phone, email: null, role, active: true, hasAccount: false },
  };
}

export async function setMemberActive(memberId: string, active: boolean): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut modifier l'équipe." };
  if (memberId === session.member.id) return { error: "Vous ne pouvez pas désactiver votre propre compte." };
  if (isDemo) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ active }).eq("id", memberId).eq("company_id", session.company.id);
  if (error) return { error: /Votre offre comprend/.test(error.message) ? error.message : "La modification n'a pas abouti." };
  revalidatePath("/equipe");
  return {};
}

/** Lien de connexion personnel d'un agent (valable 7 jours, une seule fois). Un nouveau lien annule le précédent. */
export async function createInviteLink(memberId: string): Promise<{ error?: string; token?: string }> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut inviter." };
  if (isDemo) return { token: "demonstration" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite_link", { p_member: memberId });
  if (error) return { error: /désactivé|gérant/.test(error.message) ? error.message : "Le lien n'a pas pu être créé." };
  return { token: data as string };
}

/** Modifie le prénom, le nom, le portable et le rôle d'une personne de l'équipe. */
export async function updateMember(
  memberId: string,
  input: { firstName: string; lastName: string; phone: string; role: MemberRole },
): Promise<{ error?: string; member?: Pick<Member, "firstName" | "lastName" | "phone" | "role"> }> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut modifier l'équipe." };
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName) return { error: "Indiquez le prénom." };
  const allowed: MemberRole[] = ["agent", "chef", "gerant"];
  if (!allowed.includes(input.role)) return { error: "Rôle inconnu." };
  // On ne change pas son propre rôle : l'entreprise garderait sinon peut-être zéro gérant.
  const role = memberId === session.member.id ? session.member.role : input.role;
  // Le portable sert à envoyer le lien de connexion : obligatoire sauf pour un gérant.
  const noPhone = !input.phone.trim() && role === "gerant";
  if (!noPhone && !isValidFrenchMobile(input.phone)) return { error: "Le portable doit commencer par 06 ou 07." };
  const phone = noPhone ? null : toE164(input.phone);
  if (isDemo) return { member: { firstName, lastName, phone, role } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ first_name: firstName, last_name: lastName, phone, role })
    .eq("id", memberId)
    .eq("company_id", session.company.id);
  if (error) {
    if (error.code === "23505") return { error: "Ce numéro est déjà utilisé par une autre personne de l'équipe." };
    if (/Votre offre comprend/.test(error.message)) return { error: error.message };
    return { error: "La modification n'a pas abouti. Réessayez dans un instant." };
  }
  revalidatePath("/equipe");
  if (memberId === session.member.id) revalidatePath("/", "layout"); // nom affiché dans la barre latérale
  return { member: { firstName, lastName, phone, role } };
}

/** Déconnecte à distance le téléphone d'un agent ou chef d'équipe (perdu, volé, départ). */
export async function disconnectMember(memberId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut déconnecter un membre." };
  if (isDemo) return {};
  const supabase = await createClient();
  const { error } = await supabase.rpc("disconnect_member", { p_member: memberId });
  if (error) return { error: "La déconnexion n'a pas abouti. Réessayez." };
  revalidatePath("/equipe");
  return {};
}

/**
 * Invite un autre gérant par e-mail : il reçoit un lien pour choisir son mot de passe.
 * (Un gérant a toujours un compte e-mail + mot de passe, jamais un lien de téléphone.)
 */
export async function inviteManager(memberId: string, rawEmail: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return { error: "Seul le gérant peut inviter." };
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Saisissez une adresse e-mail valide." };
  if (isDemo) return { ok: true };
  if (!adminEnabled || !emailEnabled) return { error: "L'invitation par e-mail n'est pas encore activée sur ce site." };

  // La fiche doit être un gérant de MON entreprise, pas encore relié à un compte.
  const supabase = await createClient();
  const { data: m } = await supabase.from("members").select("id, first_name, role, user_id, active").eq("id", memberId).eq("company_id", session.company.id).maybeSingle();
  if (!m || m.role !== "gerant" || !m.active) return { error: "Gérant introuvable." };
  if (m.user_id) return { error: "Ce gérant a déjà son compte." };

  const admin = adminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "invite", email });
  if (error || !link?.user) {
    if (/already|registered|exists/i.test(error?.message ?? "")) return { error: "Cette adresse a déjà un compte Swipo. Utilisez une autre adresse." };
    console.error("invitation gérant", error);
    return { error: "L'invitation n'a pas pu être créée. Réessayez." };
  }
  const { error: linkErr } = await admin.from("members").update({ user_id: link.user.id, email }).eq("id", memberId).is("user_id", null);
  if (linkErr) {
    await admin.auth.admin.deleteUser(link.user.id).catch(() => null);
    return { error: "L'invitation n'a pas pu être créée. Réessayez." };
  }
  const url = `${SITE_URL}/auth/confirmer?token_hash=${link.properties.hashed_token}&type=invite&next=/nouveau-mot-de-passe`;
  try {
    await sendEmail(
      email,
      `${session.company.name} vous invite sur Swipo`,
      emailLayout({
        title: `Bonjour ${m.first_name},`,
        paragraphs: [`${session.member.firstName} vous invite à gérer ${session.company.name} sur Swipo, avec vous comme gérant.`, "Cliquez sur le bouton pour choisir votre mot de passe. Vous vous connecterez ensuite avec cette adresse e-mail."],
        button: { label: "Choisir mon mot de passe", url },
        foot: "Ce lien est valable 24 heures. Vous ne connaissez pas cette entreprise ? Ignorez cet e-mail.",
      }),
    );
  } catch (e) {
    console.error("envoi invitation gérant", e);
    await admin.from("members").update({ user_id: null }).eq("id", memberId);
    await admin.auth.admin.deleteUser(link.user.id).catch(() => null);
    return { error: "L'e-mail n'a pas pu être envoyé. Réessayez." };
  }
  revalidatePath("/equipe");
  return { ok: true };
}
