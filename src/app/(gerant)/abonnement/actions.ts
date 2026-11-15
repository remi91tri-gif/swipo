"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PILOT_COUPON, ensureCatalog, priceId, saveBilling, stripe, stripeEnabled, tvaRate } from "@/lib/billing/stripe";
import type { Interval, PlanId } from "@/lib/billing/plans";

type Result = { error?: string; url?: string };

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function manager() {
  const session = await getSession();
  if (!session || session.member.role !== "gerant") return null;
  return session;
}

/** Client Stripe de l'entreprise (créé au premier paiement). */
async function customerFor(companyId: string, companyName: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("stripe_customer_id").eq("id", companyId).single();
  if (data?.stripe_customer_id) {
    // Un client créé en mode test n'existe pas en mode réel (et inversement) : on en crée un nouveau.
    const existing = await stripe().customers.retrieve(data.stripe_customer_id as string).catch(() => null);
    if (existing && !existing.deleted) return existing.id;
  }
  const { data: auth } = await supabase.auth.getClaims();
  const customer = await stripe().customers.create({
    email: (auth?.claims.email as string | undefined) || undefined,
    name: companyName,
    preferred_locales: ["fr"],
    metadata: { company_id: companyId },
  });
  await saveBilling({ company: companyId, customer: customer.id });
  return customer.id;
}

/** Page de paiement Stripe pour l'offre choisie. */
export async function startCheckout(plan: PlanId, interval: Interval): Promise<Result> {
  if (isDemo) return { error: "Mode démonstration : le paiement n'est pas disponible." };
  if (!stripeEnabled) return { error: "Le paiement en ligne n'est pas encore activé." };
  const session = await manager();
  if (!session) return { error: "Réservé au gérant." };
  if (session.billing.access === "actif") return openPortal();
  try {
    const [customer, price, tva, base] = await Promise.all([
      customerFor(session.company.id, session.company.name),
      priceId(plan, interval),
      tvaRate(),
      origin(),
    ]);
    const checkout = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: session.company.id,
      line_items: [{ price, quantity: 1, ...(tva ? { tax_rates: [tva] } : {}) }],
      ...(session.billing.pilotDiscount ? { discounts: [{ coupon: PILOT_COUPON }] } : { allow_promotion_codes: true }),
      subscription_data: { metadata: { company_id: session.company.id } },
      customer_update: { address: "auto", name: "auto" },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      locale: "fr",
      adaptive_pricing: { enabled: false }, // toujours en euros
      success_url: `${base}/abonnement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/abonnement`,
    });
    return { url: checkout.url ?? undefined };
  } catch (e) {
    console.error("startCheckout", e);
    return { error: "La page de paiement n'a pas pu s'ouvrir. Réessayez dans un instant." };
  }
}

/** Espace client Stripe : carte bancaire, factures, changement d'offre, résiliation. */
export async function openPortal(): Promise<Result> {
  if (isDemo || !stripeEnabled) return { error: "Le paiement en ligne n'est pas encore activé." };
  const session = await manager();
  if (!session) return { error: "Réservé au gérant." };
  try {
    await ensureCatalog();
    const customer = await customerFor(session.company.id, session.company.name);
    const portal = await stripe().billingPortal.sessions.create({ customer, locale: "fr", return_url: `${await origin()}/abonnement` });
    return { url: portal.url };
  } catch (e) {
    console.error("openPortal", e);
    return { error: "L'espace de facturation n'a pas pu s'ouvrir. Réessayez dans un instant." };
  }
}

export async function redeemPilotCode(code: string): Promise<Result> {
  if (isDemo) return { error: "Mode démonstration : rien n'est enregistré." };
  if (!code.trim()) return { error: "Saisissez votre code." };
  const session = await manager();
  if (!session) return { error: "Réservé au gérant." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_pilot_code", { p_code: code });
  if (error) return { error: /pas valable|déjà pilote/.test(error.message) ? error.message : "Le code n'a pas pu être utilisé." };
  revalidatePath("/", "layout");
  return {};
}
