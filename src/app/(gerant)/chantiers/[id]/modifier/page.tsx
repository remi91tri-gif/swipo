import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { getTeam, requireSession } from "@/lib/data";
import { getClients, getJob, parisToday } from "@/lib/data-jobs";
import { NewJobForm } from "../../nouveau/new-job-form";
import { EDITABLE_STATUSES } from "@/lib/format";

export const metadata: Metadata = { title: "Modifier le chantier" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (session.member.role !== "gerant") redirect(`/chantiers/${id}`);
  const [job, clients, team] = await Promise.all([getJob(session, id), getClients(session), getTeam(session)]);
  if (!job) notFound();
  if (!EDITABLE_STATUSES.includes(job.status)) redirect(`/chantiers/${id}`);
  const people = team.filter((m) => m.active).map(({ id: pid, firstName, lastName, role, avatarUrl }) => ({ id: pid, firstName, lastName, role, avatarUrl }));
  const memberIds = job.team.map((m) => m.id);
  const ordered = job.leadId && memberIds.includes(job.leadId) ? [job.leadId, ...memberIds.filter((m) => m !== job.leadId)] : memberIds;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <Link href={`/chantiers/${id}`} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden size={16} /> {job.title}
      </Link>
      <PageHeader title="Modifier le chantier" lead="Les agents affectés sont prévenus des changements." />
      <NewJobForm
        clients={clients}
        people={people}
        defaultClient={job.clientId}
        defaultDate={parisToday()}
        initial={{
          jobId: job.id,
          clientId: job.clientId,
          siteId: job.siteId ?? null,
          trade: job.services[0] ?? "",
          title: job.title,
          date: job.date,
          time: job.startTime,
          duration: job.durationMin,
          instructions: job.instructions,
          photos: job.photosRequired,
          checklist: job.checklist.map((c) => c.label),
          members: ordered,
        }}
      />
    </div>
  );
}
