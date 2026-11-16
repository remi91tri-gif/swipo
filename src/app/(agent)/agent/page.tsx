import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeButton } from "@/components/theme-toggle";
import { KeepMissionsOffline } from "@/components/offline-agent";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications";
import { DayList } from "./day-list";
import { getAgentDay, getAgentSession } from "@/lib/data";

export const metadata: Metadata = { title: "Mes chantiers" };

export default async function AgentTodayPage() {
  const session = await getAgentSession();
  if (!session) redirect("/agent/connexion");
  const day = await getAgentDay(session);

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/swipo-symbole.svg?v=maison" alt="Swipo" width={32} height={32} />
        <div className="flex items-center gap-2">
          <NotificationBell role={session.member.role} placement="agent" />
          <ThemeButton />
          <Link href="/agent/profil" aria-label="Mon profil" className="rounded-full transition-opacity hover:opacity-80">
            <Avatar {...session.member} size={36} />
          </Link>
        </div>
      </header>

      <KeepMissionsOffline ids={day.missions.map((m) => m.id)} />
      <DayList dateLabel={day.dateLabel} firstName={session.member.firstName} missions={day.missions} />
    </>
  );
}
