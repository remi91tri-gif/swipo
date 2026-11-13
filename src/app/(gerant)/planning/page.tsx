import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Avatar, Card, LinkButton, PageHeader, StatusPill } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { getPlanning, parisToday } from "@/lib/data-jobs";
import { ROLE_LABEL, addDays, durationLabel, longDate, timeLabel } from "@/lib/format";
import type { JobListItem } from "@/lib/types";

export const metadata: Metadata = { title: "Planning" };

function JobChip({ job }: { job: JobListItem }) {
  return (
    <Link href={`/chantiers/${job.id}`} className="flex min-w-[220px] flex-[1_1_240px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-3.5 text-ink hover:border-line-strong">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {timeLabel(job.startTime)}
          {job.durationMin ? <span className="font-normal text-ink-muted"> · {durationLabel(job.durationMin)}</span> : null}
        </span>
        <StatusPill status={job.status} />
      </span>
      <span className="font-semibold">{job.title}</span>
      <span className="text-sm text-ink-muted">{job.clientName}{job.city ? ` · ${job.city}` : ""}</span>
    </Link>
  );
}

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = parisToday();
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : today;
  const session = await requireSession();
  const day = await getPlanning(session, date);
  const total = day.rows.reduce((n, r) => n + r.jobs.length, 0);

  return (
    <>
      <PageHeader
        eyebrow={date === today ? "AUJOURD'HUI" : undefined}
        title={longDate(date).replace(/^./, (c) => c.toUpperCase())}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/planning?date=${addDays(date, -1)}`} aria-label="Jour précédent" className="flex size-11 items-center justify-center rounded-md border border-line-strong bg-surface-raised text-ink hover:bg-hairline"><ChevronLeft aria-hidden size={18} /></Link>
            {date !== today && <LinkButton href="/planning" variant="secondary">Aujourd&apos;hui</LinkButton>}
            <Link href={`/planning?date=${addDays(date, 1)}`} aria-label="Jour suivant" className="flex size-11 items-center justify-center rounded-md border border-line-strong bg-surface-raised text-ink hover:bg-hairline"><ChevronRight aria-hidden size={18} /></Link>
            <LinkButton href={`/chantiers/nouveau?date=${date}`}><Plus aria-hidden size={16} strokeWidth={2.25} /> Chantier</LinkButton>
          </div>
        }
      />

      {day.unassigned.length > 0 && (
        <Card className="flex flex-col gap-4 border-soleil/40 p-6">
          <p className="font-semibold">À affecter · {day.unassigned.length}</p>
          <div className="flex flex-wrap gap-3">{day.unassigned.map((j) => <JobChip key={j.id} job={j} />)}</div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {day.rows.length === 0 ? (
          <p className="px-7 py-8 text-ink-muted">Ajoutez votre équipe pour organiser le planning.</p>
        ) : (
          <ul>
            {day.rows.map(({ member, jobs }) => (
              <li key={member.id} className="flex flex-wrap gap-x-6 gap-y-3 border-t border-hairline px-7 py-5 first:border-t-0">
                <div className="flex w-[180px] items-center gap-3 self-start">
                  <Avatar id={member.id} firstName={member.firstName} lastName={member.lastName} />
                  <span>
                    <span className="block font-semibold">{member.firstName} {member.lastName}</span>
                    <span className="block text-[13px] text-ink-muted">{ROLE_LABEL[member.role]}</span>
                  </span>
                </div>
                <div className="flex min-w-0 flex-[1_1_300px] flex-wrap gap-3">
                  {jobs.length === 0 ? <p className="self-center text-sm text-ink-muted">Disponible</p> : jobs.map((j) => <JobChip key={j.id} job={j} />)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-sm text-ink-muted">{total === 0 && day.unassigned.length === 0 ? "Aucun chantier ce jour-là." : "Un chantier à plusieurs agents apparaît sur la ligne de chacun."}</p>
    </>
  );
}
