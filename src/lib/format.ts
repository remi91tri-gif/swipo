import type { JobStatus, MemberRole } from "./types";

export const STATUS: Record<JobStatus, { label: string; tone: "neutral" | "azur" | "critique" | "reprise" | "valide" | "soleil" | "outline" }> = {
  a_planifier: { label: "À planifier", tone: "soleil" },
  planifie: { label: "Planifié", tone: "outline" },
  en_cours: { label: "En cours", tone: "azur" },
  a_traiter: { label: "À traiter", tone: "critique" },
  termine: { label: "Terminé", tone: "neutral" },
  a_reprendre: { label: "À reprendre", tone: "reprise" },
  valide: { label: "Validé", tone: "valide" },
  annule: { label: "Annulé", tone: "neutral" },
};

export const ROLE_LABEL: Record<MemberRole, string> = {
  gerant: "Gérant",
  chef: "Chef d'équipe",
  agent: "Agent",
};

export const TRADES = [
  { id: "vitrerie", label: "Vitrerie" },
  { id: "fin_de_chantier", label: "Fin de chantier" },
  { id: "remise_en_etat", label: "Remise en état" },
  { id: "demenagement", label: "Après déménagement" },
  { id: "sinistre", label: "Après sinistre" },
  { id: "approfondi", label: "Nettoyage approfondi" },
] as const;

export function initials(firstName: string, lastName = "") {
  return ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";
}

/** Teinte d'avatar stable pour une personne (fond doux + texte de la même famille). */
export function avatarTone(id: string): "azur" | "valide" | "reprise" {
  const tones = ["azur", "valide", "reprise"] as const;
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

/** « 06 12 34 56 78 » → « +33612345678 » (format attendu pour l'envoi de SMS). */
export function toE164(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 10) d = "33" + d.slice(1);
  return d ? "+" + d : "";
}

/** « +33612345678 » → « 06 12 34 56 78 » pour l'affichage. */
export function displayPhone(phone: string | null) {
  if (!phone) return "";
  const e = toE164(phone);
  if (e.startsWith("+33") && e.length === 12) {
    return ("0" + e.slice(3)).replace(/(\d{2})(?=\d)/g, "$1 ");
  }
  return phone;
}

export function isValidFrenchMobile(phone: string) {
  return /^\+33[67]\d{8}$/.test(toE164(phone));
}

export function timeLabel(time: string | null) {
  return time ? time.slice(0, 5) : "—";
}

export function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" })
    .format(date)
    .toUpperCase();
}
