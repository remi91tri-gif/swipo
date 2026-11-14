// Offres Swipo (prix hors taxes, en centimes). Annuel : 11 mois payés, 1 mois offert.

export type PlanId = "starter" | "pro" | "business";
export type Interval = "month" | "year";

export const PLANS: { id: PlanId; name: string; tagline: string; monthly: number; members: number; features: string[]; highlight?: boolean }[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour les petites équipes",
    monthly: 3900,
    members: 5,
    features: ["Jusqu'à 5 salariés", "Chantiers et planning", "Espace agent sur téléphone", "Photos, checklists, imprévus", "Comptes rendus clients en PDF"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les entreprises en croissance",
    monthly: 6900,
    members: 10,
    features: ["Jusqu'à 10 salariés", "Toutes les fonctions de Starter"],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pour les équipes structurées",
    monthly: 9900,
    members: 30,
    features: ["Jusqu'à 30 salariés", "Toutes les fonctions de Pro"],
  },
];

export const TRIAL_DAYS = 14;

export function price(planId: PlanId, interval: Interval) {
  const p = PLANS.find((x) => x.id === planId)!;
  return interval === "year" ? p.monthly * 11 : p.monthly;
}

export function euros(cents: number) {
  const v = cents / 100;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: Number.isInteger(v) ? 0 : 2 }).format(v);
}

export const PLAN_NAME: Record<PlanId, string> = { starter: "Starter", pro: "Pro", business: "Business" };
