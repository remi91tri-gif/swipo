import type { IncidentDecision, JobStatus, MemberRole } from "./types";

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

/** « 2026-11-13 » → « ven. 13 nov. » */
export function shortDate(iso: string | null) {
  if (!iso) return "Sans date";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** « 2026-11-13 » → « vendredi 13 novembre » */
export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function durationLabel(min: number | null) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

export const CLIENT_TYPE_LABEL = { particulier: "Particulier", professionnel: "Professionnel", syndic: "Syndic", agence: "Agence" } as const;

export function eventLabel(type: string, actor: string | null) {
  const who = actor ?? "Quelqu'un";
  switch (type) {
    case "cree": return "Chantier créé";
    case "demarre": return `${who} démarre`;
    case "termine": return `${who} termine`;
    case "imprevu": return `${who} signale un imprévu`;
    case "decision": return `Décision de ${who}`;
    case "valide": return `Validé par ${who}`;
    case "reprise_demandee": return "Reprise demandée";
    case "reprise_demarree": return `${who} démarre la reprise`;
    case "modifie": return `Modifié par ${who}`;
    case "annule": return `Annulé par ${who}`;
    default: return type;
  }
}

export function clockTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}

/** Décision du gérant sur un imprévu. */
export const DECISION_LABEL: Record<IncidentDecision, string> = {
  continuer: "Continuer",
  attendre: "Attendre",
  reprogrammer: "Reprogrammer",
  ne_pas_effectuer: "Ne pas effectuer",
};

/** Un chantier se modifie tant qu'il n'a pas démarré, et s'annule tant qu'il n'est pas terminé. */
export const EDITABLE_STATUSES: JobStatus[] = ["a_planifier", "planifie", "a_reprendre"];
export const CANCELLABLE_STATUSES: JobStatus[] = ["a_planifier", "planifie", "a_reprendre", "en_cours", "a_traiter"];
