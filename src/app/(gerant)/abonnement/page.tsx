import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, Gift, TriangleAlert } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { PLAN_NAME } from "@/lib/billing/plans";
import { saveBilling, stripe, stripeEnabled } from "@/lib/billing/stripe";
import { PilotCode, PlanPicker, PortalButton } from "./plan-picker";

export const metadata: Metadata = { title: "Abonnement" };

function date(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso)) : "";
}
function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export default async function AbonnementPage({ searchParams }: { searchParams: Promise<{ session_id?: string; ok?: string }> }) {
  const { session_id: checkoutId, ok } = await searchParams;
  const session = await requireSession();
  if (session.member.role !== "gerant") redirect("/aujourdhui");

  // Retour de la page de paiement : on enregistre tout de suite, sans attendre Stripe.
  if (checkoutId && stripeEnabled) {
    let done = false;
    try {
      const s = await stripe().checkout.sessions.retrieve(checkoutId, { expand: ["subscription"] });
      if (s.client_reference_id === session.company.id && s.status === "complete" && s.subscription && typeof s.subscription !== "string") {
        await saveBilling({ company: session.company.id, customer: typeof s.customer === "string" ? s.customer : s.customer?.id, subscription: s.subscription });
        done = true;
      }
    } catch (e) {
      console.error("retour de paiement", e);
    }
    redirect(done ? "/abonnement?ok=1" : "/abonnement");
  }

  const b = session.billing;
  // Accès offert sans fin (entreprise du fondateur, partenaires) : pilote jusqu'à une date très lointaine.
  const forever = b.access === "pilote" && !!b.pilotUntil && new Date(b.pilotUntil).getFullYear() >= 2900;
  return (
    <>
      <PageHeader title="Abonnement" lead={session.company.name} />

      {ok && (
        <p role="status" className="flex items-center gap-2.5 rounded-lg bg-valide-soft px-5 py-3.5 font-semibold text-valide">
          <CheckCircle2 aria-hidden size={18} /> Merci ! Votre abonnement {PLAN_NAME[b.plan]} est actif.
        </p>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-5 p-7">
        <div className="flex items-start gap-4">
          <span className={`flex size-11 flex-none items-center justify-center rounded-full ${b.access === "expire" || b.status === "past_due" ? "bg-critique-soft text-critique" : b.access === "pilote" ? "bg-valide-soft text-valide" : "bg-azur-subtle text-azur"}`}>
            {b.access === "pilote" ? <Gift aria-hidden size={20} /> : b.access === "expire" || b.status === "past_due" ? <TriangleAlert aria-hidden size={20} /> : <CalendarClock aria-hidden size={20} />}
          </span>
          <div className="flex flex-col gap-1">
            {b.access === "essai" && (
              <>
                <p className="font-display text-xl font-semibold">Essai gratuit : encore {daysLeft(b.trialEndsAt)} jour{daysLeft(b.trialEndsAt) > 1 ? "s" : ""}</p>
                <p className="text-ink-muted">Jusqu&apos;au {date(b.trialEndsAt)}. Choisissez une offre pour continuer ensuite, sans perdre vos données.</p>
              </>
            )}
            {forever && (
              <>
                <p className="font-display text-xl font-semibold">Accès offert en permanence</p>
                <p className="text-ink-muted">Swipo est gratuit pour votre entreprise, sans limite de durée ni d&apos;équipe. Rien à payer, rien à résilier.</p>
              </>
            )}
            {b.access === "pilote" && !forever && (
              <>
                <p className="font-display text-xl font-semibold">Entreprise pilote : Swipo est gratuit</p>
                <p className="text-ink-muted">Jusqu&apos;au {date(b.pilotUntil)}. Ensuite, -50 % à vie sur l&apos;offre de votre choix. Merci pour vos retours !</p>
              </>
            )}
            {b.access === "actif" && (
              <>
                <p className="font-display text-xl font-semibold">Offre {PLAN_NAME[b.plan]} · {b.interval === "year" ? "annuelle" : "mensuelle"}</p>
                <p className={b.status === "past_due" ? "font-semibold text-critique" : "text-ink-muted"}>
                  {b.status === "past_due"
                    ? "Le dernier paiement a échoué : mettez à jour votre carte pour garder l'accès."
                    : b.cancelAtPeriodEnd
                      ? `Résilié : l'accès reste ouvert jusqu'au ${date(b.periodEnd)}.`
                      : b.periodEnd
                        ? `Prochain renouvellement le ${date(b.periodEnd)}.`
                        : "Abonnement actif."}
                </p>
              </>
            )}
            {b.access === "expire" && (
              <>
                <p className="font-display text-xl font-semibold">Votre accès est en pause</p>
                <p className="text-ink-muted">L&apos;essai ou l&apos;abonnement est terminé. Vos données sont conservées : choisissez une offre pour tout retrouver.</p>
              </>
            )}
          </div>
        </div>
        {b.hasCustomer && stripeEnabled && <PortalButton label={b.access === "actif" ? "Gérer mon abonnement" : "Mes factures"} />}
      </Card>

      {forever ? null : !stripeEnabled ? (
        <p className="rounded-lg bg-soleil-soft px-5 py-4 text-soleil-ink">Le paiement en ligne sera bientôt disponible.</p>
      ) : (
        <section className="flex flex-col gap-4">
          <CardTitle>{b.access === "actif" ? "Changer d'offre" : "Choisir une offre"}</CardTitle>
          <PlanPicker current={b.plan} active={b.access === "actif"} pilotDiscount={b.pilotDiscount} />
        </section>
      )}

      {!b.pilotDiscount && b.access !== "actif" && !forever && (
        <Card className="flex flex-col gap-3 p-7">
          <CardTitle>Vous participez au programme pilote ?</CardTitle>
          <p className="text-ink-muted">Saisissez le code reçu de Swipo : l&apos;accès est gratuit pendant le pilote, puis -50 % à vie.</p>
          <PilotCode />
        </Card>
      )}
    </>
  );
}
