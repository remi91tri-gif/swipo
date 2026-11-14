import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { OfflineAgent } from "@/components/offline-agent";
import { getAgentSession } from "@/lib/data";

// Toujours calculé à la visite : la date du jour et les données changent.
export const dynamic = "force-dynamic";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getAgentSession();
  if (!session) redirect("/agent/connexion");
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        <OfflineAgent />
        {children}
      </div>
    </div>
  );
}
