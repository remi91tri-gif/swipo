import Link from "next/link";
import { AvatarStack, StatusPill } from "./ui";
import { shortDate, timeLabel } from "@/lib/format";
import type { JobListItem } from "@/lib/types";

/** Une ligne de chantier dans une liste (planning, liste, fiche client). */
export function JobRow({ job, showDate = false }: { job: JobListItem; showDate?: boolean }) {
  return (
    <li className="border-t border-hairline">
      <Link href={`/chantiers/${job.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-7 py-4 text-ink hover:bg-surface">
        <span className={`${showDate ? "w-24" : "w-12"} text-sm text-ink-muted tabular-nums`}>
          {showDate && <span className="block font-semibold text-ink">{shortDate(job.date)}</span>}
          {timeLabel(job.startTime)}
        </span>
        <span className="min-w-0 flex-[1_1_220px]">
          <span className="block font-semibold">{job.title}</span>
          <span className="block text-sm text-ink-muted">
            {job.clientName}
            {job.city ? ` · ${job.city}` : ""}
          </span>
        </span>
        <AvatarStack people={job.team} />
        <span className="w-28 text-right">
          <StatusPill status={job.status} />
        </span>
      </Link>
    </li>
  );
}
