import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { DemoBanner } from "@/components/demo-banner";
import { NotificationsFeed } from "@/components/notifications";
import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/data";

// Toujours calculé à la visite : la date du jour et les données changent.
export const dynamic = "force-dynamic";

export default async function GerantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.member.role === "agent") redirect("/agent");
  const { member, company } = session;

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <NotificationsFeed memberId={member.id} role={member.role} />
      <div className="flex flex-1 flex-wrap">
        <Sidebar person={{ id: member.id, firstName: member.firstName, lastName: member.lastName }} role={member.role} companyName={company.name} signOut={signOut} />
        <main className="min-w-0 flex-[999_1_640px] px-4 pt-10 pb-16 sm:px-12">
          <div className="mx-auto flex max-w-[1040px] flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
