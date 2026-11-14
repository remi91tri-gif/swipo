import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, KeyRound, Store, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { AvatarUpload } from "@/components/avatar-upload";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { PLAN_NAME } from "@/lib/billing/plans";
import { stripeEnabled } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";
import { CancelSubscription, CompanyForm, PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Paramètres" };

function date(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso)) : "";
}

function Section({ icon, title, lead, children }: { icon: ReactNode; title: string; lead?: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-5 p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-azur-subtle text-azur">{icon}</span>
        <div>
          <CardTitle>{title}</CardTitle>
          {lead && <p className="text-sm text-ink-muted">{lead}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default async function ParametresPage() {
  const session = await requireSession();
  const { member, billing } = session;
  const isManager = member.role === "gerant";

  let email: string | null = null;
  let company = { name: session.company.name, phone: null as string | null, address: null as string | null, siret: null as string | null };
  if (!isDemo) {
    const supabase = await createClient();
    const [{ data: auth }, { data: c }] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.from("companies").select("name, phone, address, siret").eq("id", session.company.id).single(),
    ]);
    email = (auth?.claims.email as string | undefined) || null;
    if (c) company = c;
  }

  return (
    <>
      <PageHeader title="Paramètres" lead="Votre profil, votre compte et votre entreprise." />

      <Section icon={<UserRound aria-hidden size={19} />} title="Mon profil" lead={email ? `Connexion : ${email}` : "Connexion par lien personnel"}>
        <AvatarUpload companyId={session.company.id} member={member} />
        <ProfileForm member={member} canEdit={isManager} />
      </Section>

      <Section icon={<KeyRound aria-hidden size={19} />} title="Mot de passe">
        <PasswordForm hasPassword={!!email || isDemo} />
      </Section>

      {isManager && (
        <Section icon={<Store aria-hidden size={19} />} title="Mon entreprise">
          <CompanyForm company={company} />
        </Section>
      )}

      {isManager && (
        <Section icon={<CreditCard aria-hidden size={19} />} title="Abonnement">
          {billing.access === "actif" ? (
            <>
              <CancelSubscription
                planLabel={`Offre ${PLAN_NAME[billing.plan]} ${billing.interval === "year" ? "annuelle" : "mensuelle"}`}
                cancelled={billing.cancelAtPeriodEnd}
                periodEnd={date(billing.periodEnd) || "la fin de la période payée"}
                canChange={stripeEnabled}
              />
              <Link href="/abonnement" className="text-sm font-semibold text-azur hover:underline">Changer d&apos;offre, carte bancaire et factures</Link>
            </>
          ) : (
            <>
              <p className="text-ink-muted">
                {billing.access === "essai"
                  ? `Essai gratuit jusqu'au ${date(billing.trialEndsAt)} : rien à résilier, aucun prélèvement n'a lieu sans votre accord.`
                  : billing.access === "pilote"
                    ? `Entreprise pilote : Swipo est gratuit jusqu'au ${date(billing.pilotUntil)}.`
                    : "Aucun abonnement en cours."}
              </p>
              <Link href="/abonnement" className="text-sm font-semibold text-azur hover:underline">Voir les offres</Link>
            </>
          )}
        </Section>
      )}
    </>
  );
}
