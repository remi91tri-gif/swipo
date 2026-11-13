import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAgentSession } from "@/lib/data";
import { getAgentMission } from "@/lib/data-agent";
import { MissionScreen } from "./mission-screen";

export const metadata: Metadata = { title: "Mission" };

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAgentSession();
  if (!session) redirect("/agent/connexion");
  const mission = await getAgentMission(session, id);
  if (!mission) notFound();
  return <MissionScreen mission={mission} />;
}
