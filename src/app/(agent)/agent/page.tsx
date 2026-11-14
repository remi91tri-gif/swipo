import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { ThemeButton } from "@/components/theme-toggle";
import { AgentSignOut, KeepMissionsOffline } from "@/components/offline-agent";
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
        <img src="/brand/swipo-symbole.svg" alt="Swipo" width={32} height={32} />
        <div className="flex items-center gap-2">
          <NotificationBell role={session.member.role} placement="agent" />
          <ThemeButton />
          <AgentSignOut action={signOut} />
        </div>
      </header>

      <KeepMissionsOffline ids={day.missions.map((m) => m.id)} />
      <DayList dateLabel={day.dateLabel} firstName={session.member.firstName} missions={day.missions} />
    </>
  );
}
