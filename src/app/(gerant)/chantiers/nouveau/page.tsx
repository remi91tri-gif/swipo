import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { getTeam, requireSession } from "@/lib/data";
import { getClients, parisToday } from "@/lib/data-jobs";
import { NewJobForm } from "./new-job-form";

export const metadata: Metadata = { title: "Nouveau chantier" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ client?: string; date?: string }> }) {
  const { client, date } = await searchParams;
  const session = await requireSession();
  const [clients, team] = await Promise.all([getClients(session), getTeam(session)]);
  const people = team.filter((m) => m.active).map(({ id, firstName, lastName, role, avatarUrl }) => ({ id, firstName, lastName, role, avatarUrl }));

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <Link href="/chantiers" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden size={16} /> Chantiers
      </Link>
      <PageHeader title="Nouveau chantier" lead="L'essentiel en premier. Le reste est facultatif." />
      <NewJobForm clients={clients} people={people} defaultClient={client ?? ""} defaultDate={date ?? parisToday()} />
    </div>
  );
}
