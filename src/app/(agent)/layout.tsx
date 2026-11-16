import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { OfflineAgent } from "@/components/offline-agent";
import { NotificationsFeed } from "@/components/notifications";
import { getAgentSession } from "@/lib/data";

// Toujours calculé à la visite : la date du jour et les données changent.
export const dynamic = "force-dynamic";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getAgentSession();
  if (!session) redirect("/agent/connexion");
  if (session.billing.access === "expire") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/swipo-symbole.svg?v=maison" alt="" width={44} height={44} />
        <h1 className="mt-2 font-display text-[26px] leading-8 font-semibold tracking-[-0.02em]">Accès en pause</h1>
        <p className="text-ink-muted">L&apos;abonnement Swipo de {session.company.name} est à renouveler. Votre gérant a été prévenu ; vos missions reviendront dès qu&apos;il l&apos;aura fait.</p>
      </main>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <NotificationsFeed memberId={session.member.id} role={session.member.role} />
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        <OfflineAgent />
        {children}
      </div>
    </div>
  );
}
