import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { DemoBanner } from "@/components/demo-banner";
import { NotificationsFeed } from "@/components/notifications";
import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/data";

// Espace privé : Google ne doit pas l'indexer.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Toujours calculé à la visite : la date du jour et les données changent.
export const dynamic = "force-dynamic";

export default async function GerantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  // L'espace gérant est réservé aux gérants : agents et chefs d'équipe ont leur propre espace.
  if (session.member.role !== "gerant") redirect("/agent");
  const { member, company, billing } = session;
  // Essai ou abonnement terminé : seule la page Abonnement reste ouverte (les données sont gardées).
  const path = (await headers()).get("x-pathname") ?? "";
  if (billing.access === "expire" && !path.startsWith("/abonnement") && !path.startsWith("/parametres")) redirect("/abonnement");
  const trialDays = Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / 86400000));

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <NotificationsFeed memberId={member.id} role={member.role} />
      {billing.access === "essai" && member.role === "gerant" && !path.startsWith("/abonnement") && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-azur-subtle px-4 py-2 text-center text-sm text-azur">
          <span>Essai gratuit : encore <strong>{trialDays} jour{trialDays > 1 ? "s" : ""}</strong>.</span>
          <Link href="/abonnement" className="font-semibold underline underline-offset-2">Choisir une offre</Link>
        </p>
      )}
      {billing.status === "past_due" && member.role === "gerant" && (
        <p className="bg-critique-soft px-4 py-2 text-center text-sm font-semibold text-critique">
          Le dernier paiement a échoué. <Link href="/abonnement" className="underline underline-offset-2">Mettre à jour ma carte</Link>
        </p>
      )}
      <div className="flex flex-1 flex-wrap">
        <Sidebar person={{ id: member.id, firstName: member.firstName, lastName: member.lastName, avatarUrl: member.avatarUrl }} role={member.role} companyName={company.name} signOut={signOut} />
        <main className="min-w-0 flex-[999_1_640px] px-4 pt-6 pb-16 sm:px-12 sm:pt-10">
          <div className="mx-auto flex max-w-[1040px] flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
