// Offres Swipo (prix hors taxes, en centimes). Annuel : 11 mois payés, 1 mois offert.

export type PlanId = "starter" | "pro" | "business";
export type Interval = "month" | "year";

export const PLANS: {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  /** Salariés (agents et chefs d'équipe), hors gérants. */
  members: number;
  /** Gérants ; null = illimité. */
  managers: number | null;
  /** « 1 gérant et 3 salariés », pour les textes. */
  seats: string;
  clientReport: boolean;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour les petites équipes",
    monthly: 3900,
    members: 3,
    managers: 1,
    seats: "1 gérant et jusqu'à 3 salariés",
    clientReport: false,
    features: ["1 gérant et jusqu'à 3 salariés", "Chantiers et planning", "Espace agent sur téléphone", "Photos, checklists, imprévus", "Travail sans réseau"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les entreprises en croissance",
    monthly: 6900,
    members: 10,
    managers: 2,
    seats: "jusqu'à 2 gérants et 10 salariés",
    clientReport: true,
    features: ["Jusqu'à 2 gérants et 10 salariés", "Toutes les fonctions de Starter", "Comptes rendus clients en PDF, à votre logo"],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pour les équipes structurées",
    monthly: 9900,
    members: 30,
    managers: null,
    seats: "gérants illimités et jusqu'à 30 salariés",
    clientReport: true,
    features: ["Gérants illimités, jusqu'à 30 salariés", "Toutes les fonctions de Pro"],
  },
];

export const TRIAL_DAYS = 14;

/**
 * Franchise en base de TVA (auto-entrepreneur) : les prix sont affichés sans « HT » et Stripe n'ajoute pas de TVA
 * (variable STRIPE_TVA=0 dans Vercel). Le jour où la TVA est facturée : passer à false et retirer STRIPE_TVA.
 */
export const VAT_FREE = true;
/** « HT » après un prix, ou rien en franchise de TVA. */
export const HT = VAT_FREE ? "" : " HT";
export const VAT_NOTE = VAT_FREE ? "TVA non applicable, art. 293 B du CGI." : "Prix hors taxes, TVA en plus.";

export function price(planId: PlanId, interval: Interval) {
  const p = PLANS.find((x) => x.id === planId)!;
  return interval === "year" ? p.monthly * 11 : p.monthly;
}

export function euros(cents: number) {
  const v = cents / 100;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: Number.isInteger(v) ? 0 : 2 }).format(v);
}

export const PLAN_NAME: Record<PlanId, string> = { starter: "Starter", pro: "Pro", business: "Business" };

/** Compte rendu client en PDF : offres Pro et Business, et tout l'essai ou le pilote. */
export function hasClientReport(b: { access: string; plan: PlanId }) {
  if (b.access === "essai" || b.access === "pilote") return true;
  return b.access === "actif" && PLANS.find((p) => p.id === b.plan)!.clientReport;
}
