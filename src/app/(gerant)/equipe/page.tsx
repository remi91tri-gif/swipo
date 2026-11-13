import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/ui";
import { getTeam, requireSession } from "@/lib/data";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Équipe" };

export default async function EquipePage() {
  const session = await requireSession();
  const team = await getTeam(session);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const active = team.filter((m) => m.active).length;

  return (
    <>
      <PageHeader eyebrow={session.company.name.toUpperCase()} title="Équipe" lead={`${active} personne${active > 1 ? "s" : ""} dans l'équipe. Chacun se connecte avec son portable, sans mot de passe.`} />
      <TeamManager initialTeam={team} origin={origin} companyName={session.company.name} meId={session.member.id} />
    </>
  );
}
