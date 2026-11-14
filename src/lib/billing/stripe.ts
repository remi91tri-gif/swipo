import "server-only";
import Stripe from "stripe";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { PLANS, price, type Interval, type PlanId } from "./plans";

export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquante");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  return client;
}

const lookupKey = (plan: PlanId, interval: Interval) => `swipo_${plan}_${interval === "year" ? "annuel" : "mensuel"}`;
export const PILOT_COUPON = "swipo-pilote-50";

/**
 * Crée dans Stripe, si besoin, les offres, la réduction pilote, la TVA et l'espace client.
 * Fonctionne pareil en mode test et en mode réel : rien à configurer à la main.
 */
let catalogReady: Promise<Map<string, string>> | null = null;
export function ensureCatalog() {
  catalogReady ??= (async () => {
    const s = stripe();
    const keys = PLANS.flatMap((p) => (["month", "year"] as Interval[]).map((i) => lookupKey(p.id, i)));
    const existing = await s.prices.list({ lookup_keys: keys, active: true, limit: 100 });
    const byKey = new Map(existing.data.map((p) => [p.lookup_key!, p.id]));
    for (const plan of PLANS) {
      const missing = (["month", "year"] as Interval[]).filter((i) => !byKey.has(lookupKey(plan.id, i)));
      if (!missing.length) continue;
      const found = await s.products.search({ query: `metadata['swipo_plan']:'${plan.id}'` });
      const description = `${plan.tagline} · ${plan.seats}`;
      if (found.data[0] && found.data[0].description !== description) await s.products.update(found.data[0].id, { description });
      const product =
        found.data[0] ??
        (await s.products.create({
          name: `Swipo ${plan.name}`,
          description,
          metadata: { swipo_plan: plan.id },
          tax_code: "txcd_10103001", // logiciel en ligne (SaaS)
        }));
      for (const interval of missing) {
        const p = await s.prices.create({
          product: product.id,
          currency: "eur",
          unit_amount: price(plan.id, interval),
          recurring: { interval },
          tax_behavior: "exclusive",
          lookup_key: lookupKey(plan.id, interval),
          transfer_lookup_key: true,
          nickname: `${plan.name} ${interval === "year" ? "annuel" : "mensuel"}`,
          metadata: { swipo_plan: plan.id },
        });
        byKey.set(p.lookup_key!, p.id);
      }
    }
    try {
      await s.coupons.retrieve(PILOT_COUPON);
    } catch {
      await s.coupons.create({ id: PILOT_COUPON, percent_off: 50, duration: "forever", name: "Entreprise pilote -50 %" });
    }
    const configs = await s.billingPortal.configurations.list({ is_default: true, limit: 1 });
    if (!configs.data.length) {
      await s.billingPortal.configurations.create({
        business_profile: { headline: "Votre abonnement Swipo" },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id", "name"] },
          subscription_cancel: { enabled: true, mode: "at_period_end" },
        },
      });
    }
    return byKey;
  })().catch((e) => {
    catalogReady = null;
    throw e;
  });
  return catalogReady;
}

export async function priceId(plan: PlanId, interval: Interval) {
  const id = (await ensureCatalog()).get(lookupKey(plan, interval));
  if (!id) throw new Error(`Prix introuvable : ${plan} ${interval}`);
  return id;
}

/** TVA à 20 % ajoutée aux prix HT (STRIPE_TVA=0 pour une entreprise non assujettie). */
let taxRate: Promise<string | null> | null = null;
export function tvaRate() {
  taxRate ??= (async () => {
    const pct = Number(process.env.STRIPE_TVA ?? "20");
    if (!pct) return null;
    const s = stripe();
    const list = await s.taxRates.list({ active: true, limit: 100 });
    const hit = list.data.find((t) => t.metadata?.swipo === "tva" && t.percentage === pct && !t.inclusive);
    if (hit) return hit.id;
    const created = await s.taxRates.create({ display_name: "TVA", percentage: pct, inclusive: false, country: "FR", jurisdiction: "FR", metadata: { swipo: "tva" } });
    return created.id;
  })().catch((e) => {
    taxRate = null;
    throw e;
  });
  return taxRate;
}

export function planOfPrice(p: Stripe.Price | string | null | undefined): PlanId | null {
  if (!p || typeof p === "string") return null;
  const v = p.metadata?.swipo_plan ?? p.lookup_key?.split("_")[1];
  return v === "starter" || v === "pro" || v === "business" ? v : null;
}

/** Écrit l'état de l'abonnement dans la base (fonction protégée par le secret du serveur). */
export async function saveBilling(args: {
  company?: string | null;
  customer?: string | null;
  subscription?: Stripe.Subscription | null;
  clearSubscription?: boolean;
}) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET manquante");
  const sb = createSupabase(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const sub = args.subscription;
  const item = sub?.items.data[0];
  const { error } = await sb.rpc("billing_update", {
    p_secret: secret,
    p_company: args.company ?? (sub?.metadata?.company_id || null),
    p_customer: args.customer ?? (typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id) ?? null,
    p_subscription: args.clearSubscription ? "" : (sub?.id ?? null),
    p_status: args.clearSubscription ? "canceled" : (sub?.status ?? null),
    p_plan: planOfPrice(item?.price),
    p_interval: item?.price.recurring?.interval === "year" ? "year" : item?.price.recurring ? "month" : null,
    p_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    p_cancel: sub ? sub.cancel_at_period_end || !!sub.cancel_at : null,
  });
  if (error) throw new Error(`billing_update : ${error.message}`);
}
