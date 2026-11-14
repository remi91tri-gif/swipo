import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, FileText, Lock, MapPin, Phone } from "lucide-react";
import { Avatar, Card, CardTitle, LinkButton, StatusPill } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { getJob } from "@/lib/data-jobs";
import { clockTime, displayPhone, durationLabel, eventLabel, longDate, timeLabel } from "@/lib/format";
import { JobActions } from "./job-actions";
import { DECISION_LABEL } from "@/lib/format";
import { hasClientReport } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Fiche chantier" };

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const [{ id }, { cree }] = await Promise.all([params, searchParams]);
  const session = await requireSession();
  const job = await getJob(session, id);
  if (!job) notFound();
  const done = job.checklist.filter((c) => c.done).length;

  return (
    <>
      <Link href="/chantiers" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden size={16} /> Chantiers
      </Link>

      {cree && (
        <p role="status" className="rounded-lg bg-valide-soft px-5 py-3.5 font-semibold text-valide">
          Chantier créé.{job.team.length ? " Les agents le voient dans leur espace." : " Affectez-lui un agent pour qu'il passe Planifié."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted">
          {job.date ? longDate(job.date).toUpperCase() : "SANS DATE"}
          {job.startTime ? ` · ${timeLabel(job.startTime)}` : ""}
          {job.durationMin ? ` · ${durationLabel(job.durationMin)}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="font-display text-[34px] leading-[42px] font-semibold tracking-[-0.025em]">{job.title}</h1>
          <StatusPill status={job.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-ink-muted">
            <Link href={`/clients/${job.clientId}`} className="font-semibold text-ink-muted hover:text-ink">{job.clientName}</Link>
            {job.services.length ? ` · ${job.services.join(", ")}` : ""}
          </p>
          {(job.status === "termine" || job.status === "valide") &&
            (hasClientReport(session.billing) ? (
              <LinkButton href={`/chantiers/${job.id}/rapport`} variant="secondary">
                <FileText aria-hidden size={16} /> Compte rendu client
              </LinkButton>
            ) : (
              <LinkButton href="/abonnement" variant="ghost" title="Inclus dans les offres Pro et Business">
                <Lock aria-hidden size={15} /> Compte rendu client · offre Pro
              </LinkButton>
            ))}
        </div>
      </div>

      <JobActions job={job} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <Card className="flex flex-col gap-4 p-7">
            <CardTitle>Lieu et accès</CardTitle>
            <p className="flex gap-3"><MapPin aria-hidden size={18} className="mt-0.5 flex-none text-ink-muted" />{job.address}</p>
            {job.accessInfo && <p className="rounded-md bg-surface px-4 py-3 text-ink-muted">{job.accessInfo}</p>}
            {(job.onsiteContact || job.clientPhone) && (
              <p className="flex gap-3 text-ink-muted"><Phone aria-hidden size={18} className="mt-0.5 flex-none" />{job.onsiteContact ?? displayPhone(job.clientPhone)}</p>
            )}
          </Card>

          {job.photos.length > 0 && (
            <Card className="flex flex-col gap-4 p-7">
              <CardTitle action={<span className="text-sm text-ink-muted">{job.photos.filter((p) => p.kind === "avant").length} avant · {job.photos.filter((p) => p.kind === "apres").length} après</span>}>Photos</CardTitle>
              <div className="grid grid-cols-3 gap-3">
                {job.photos.map((p) => (
                  <figure key={p.id} className="m-0">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Photo ${p.kind}`} className="aspect-[4/3] w-full rounded-lg object-cover" />
                      </a>
                    ) : (
                      <div className="aspect-[4/3] rounded-lg bg-hairline" />
                    )}
                    <figcaption className="mt-1.5 text-[13px] text-ink-muted">{p.kind === "avant" ? "Avant" : p.kind === "apres" ? "Après" : p.kind === "probleme" ? "Problème" : "Photo"}</figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          )}

          {job.instructions && (
            <Card className="flex flex-col gap-2.5 p-7">
              <CardTitle>Consignes</CardTitle>
              <p className="whitespace-pre-line">{job.instructions}</p>
            </Card>
          )}

          {job.checklist.length > 0 && (
            <Card className="flex flex-col p-7">
              <CardTitle action={<span className={`text-sm font-semibold ${done === job.checklist.length ? "text-valide" : "text-ink-muted"}`}>{done} sur {job.checklist.length}</span>}>Checklist</CardTitle>
              <ul className="mt-2">
                {job.checklist.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
                    <span aria-hidden className={`flex size-[22px] flex-none items-center justify-center rounded-full ${c.done ? "bg-valide text-on-ink" : "border-2 border-line-strong"}`}>
                      {c.done && <Check size={12} strokeWidth={3.5} />}
                    </span>
                    <span className={c.done ? "" : "text-ink-muted"}>{c.label}</span>
                    <span className="sr-only">{c.done ? "fait" : "à faire"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {job.finishComment && (
            <Card className="flex flex-col gap-2.5 p-7">
              <CardTitle>Note de l&apos;équipe</CardTitle>
              <p>« {job.finishComment} »</p>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <CardTitle>Équipe</CardTitle>
            {job.team.length === 0 && <p className="text-ink-muted">Aucun agent affecté.</p>}
            {job.team.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar {...m} />
                <span className="font-semibold">{m.firstName} {m.lastName}</span>
                {job.leadId === m.id && job.team.length > 1 && <span className="text-sm text-ink-muted">responsable</span>}
              </div>
            ))}
            <p className="text-sm text-ink-muted">{job.photosRequired ? "Photos avant et après demandées." : "Photos facultatives."}</p>
          </Card>

          {job.incidents.length > 0 && (
            <Card className="flex flex-col gap-4 p-6">
              <CardTitle>Imprévus</CardTitle>
              {job.incidents.map((i) => (
                <div key={i.id} className="flex flex-col gap-1 border-t border-hairline pt-3 first:border-t-0 first:pt-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{i.urgency === "bloquant" ? "Bloquant" : "Pour information"}</span>
                    <span className="text-[13px] text-ink-muted tabular-nums">{clockTime(i.reportedAt)}</span>
                  </span>
                  {i.comment && <span className="text-ink-muted">« {i.comment} »</span>}
                  {i.decision ? (
                    <span className="text-sm">Décision : <span className="font-semibold">{DECISION_LABEL[i.decision]}</span>{i.managerMessage ? ` · « ${i.managerMessage} »` : ""}</span>
                  ) : (
                    i.urgency === "bloquant" && <span className="text-sm font-semibold text-critique">En attente de votre décision</span>
                  )}
                </div>
              ))}
            </Card>
          )}

          <Card className="flex flex-col gap-4 p-6">
            <CardTitle>Chronologie</CardTitle>
            <ol className="flex flex-col gap-4 border-l border-line-strong pl-[18px]">
              {job.events.map((e, i) => (
                <li key={i} className="relative">
                  <span aria-hidden className={`absolute top-1.5 -left-[23px] size-[9px] rounded-full ${i === job.events.length - 1 ? "bg-azur" : "border-2 border-line-strong bg-surface-raised"}`} />
                  <span className="block text-[13px] text-ink-muted tabular-nums">{clockTime(e.at)}</span>
                  {eventLabel(e.type, e.actor)}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
