import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAgentSession } from "@/lib/data";
import { getAgentMission } from "@/lib/data-agent";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Signaler un problème" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAgentSession();
  if (!session) redirect("/agent/connexion");
  const mission = await getAgentMission(session, id);
  if (!mission) notFound();
  return <ReportForm jobId={mission.id} companyId={mission.companyId} title={mission.title} />;
}
