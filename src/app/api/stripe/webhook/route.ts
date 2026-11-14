import type Stripe from "stripe";
import { saveBilling, stripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe prévient Swipo de chaque changement d'abonnement : paiement, renouvellement, échec, résiliation. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature || !process.env.STRIPE_SECRET_KEY) return new Response("Non configuré", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          await saveBilling({ company: s.client_reference_id, customer: typeof s.customer === "string" ? s.customer : s.customer?.id, subscription: sub });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await saveBilling({ subscription: event.data.object });
        break;
      case "customer.subscription.deleted":
        await saveBilling({ subscription: event.data.object, clearSubscription: true });
        break;
      case "invoice.payment_failed":
      case "invoice.paid": {
        const inv = event.data.object;
        const subId = inv.parent?.subscription_details?.subscription;
        if (subId) await saveBilling({ subscription: await stripe().subscriptions.retrieve(typeof subId === "string" ? subId : subId.id) });
        break;
      }
    }
  } catch (e) {
    console.error("webhook Stripe", event.type, e);
    return new Response("Erreur", { status: 500 }); // Stripe réessaiera
  }
  return new Response("ok");
}
