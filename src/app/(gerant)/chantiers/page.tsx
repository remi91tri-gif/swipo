import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { JobRow } from "@/components/job-row";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { JOB_TABS, getJobs, type JobTab } from "@/lib/data-jobs";

export const metadata: Metadata = { title: "Chantiers" };

const EMPTY: Record<JobTab, string> = {
  "a-venir": "Aucun chantier à venir.",
  "en-cours": "Aucun chantier en cours en ce moment.",
  "a-verifier": "Rien à vérifier : tous les chantiers terminés sont validés.",
  historique: "Aucun chantier validé ou annulé pour l'instant.",
};

export default async function ChantiersPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const tab = (JOB_TABS.find((t) => t.id === vue)?.id ?? "a-venir") as JobTab;
  const session = await requireSession();
  const jobs = await getJobs(session, tab);

  return (
    <>
      <PageHeader
        title="Chantiers"
        action={
          <LinkButton href="/chantiers/nouveau">
            <Plus aria-hidden size={16} strokeWidth={2.25} /> Nouveau chantier
          </LinkButton>
        }
      />
      <nav aria-label="Filtrer les chantiers" className="flex flex-wrap gap-1 self-start rounded-md bg-hairline p-1">
        {JOB_TABS.map((t) => (
          <Link
            key={t.id}
            href={`/chantiers?vue=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className="rounded-[9px] px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink aria-[current=page]:bg-surface-raised aria-[current=page]:text-ink aria-[current=page]:shadow-[0_1px_3px_#0000002e]"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Card className="overflow-hidden">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-start gap-4 px-7 py-8">
            <p className="text-ink-muted">{EMPTY[tab]}</p>
            {tab === "a-venir" && <LinkButton href="/chantiers/nouveau" variant="secondary">Créer un chantier</LinkButton>}
          </div>
        ) : (
          <ul className="[&>li:first-child]:border-t-0">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} showDate />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
