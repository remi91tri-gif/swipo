import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ChevronRight, Plus } from "lucide-react";
import { Avatar, AvatarStack, Card, CardTitle, LinkButton, PageHeader, StatusPill } from "@/components/ui";
import { getDashboard, requireSession } from "@/lib/data";
import { timeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Aujourd'hui" };

function summary(blockers: number, jobs: number) {
  if (blockers === 1) return "Une seule décision vous attend.";
  if (blockers > 1) return `${blockers} décisions vous attendent.`;
  if (jobs === 0) return "Aucun chantier prévu aujourd'hui.";
  return "Tout se déroule normalement.";
}

export default async function AujourdhuiPage() {
  const session = await requireSession();
  const d = await getDashboard(session);
  const stats = [
    { label: "Chantiers prévus", value: d.counts.prevus, tone: "text-ink" },
    { label: "En cours", value: d.counts.enCours, tone: "text-azur" },
    { label: "À traiter", value: d.counts.aTraiter, tone: d.counts.aTraiter ? "text-critique" : "text-ink" },
    { label: "À vérifier", value: d.counts.aVerifier, tone: "text-ink" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={d.dateLabel}
        title={`Bonjour ${session.member.firstName}`}
        lead={summary(d.blockers.length, d.jobs.length)}
        action={
          <LinkButton href="/chantiers/nouveau">
            <Plus aria-hidden size={16} strokeWidth={2.25} />
            Nouveau chantier
          </LinkButton>
        }
      />

      {d.blockers.map((b) => (
        <Link
          key={b.incidentId}
          href={`/chantiers/${b.jobId}`}
          className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-xl border border-line bg-surface-raised px-6 py-5 text-ink shadow-card hover:border-line-strong"
        >
          <span aria-hidden className="flex size-11 flex-none items-center justify-center rounded-full bg-critique-soft text-critique">
            <AlertCircle size={20} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-[1_1_280px]">
            <span className="block text-base font-semibold">
              {b.jobTitle} · {b.place}
            </span>
            <span className="block text-ink-muted">
              {b.reportedBy} a signalé un problème à {b.reportedAt}
              {b.comment ? ` : « ${b.comment} »` : "."}
            </span>
          </span>
          <span className="inline-flex h-10 items-center rounded-md bg-ink px-4 font-semibold text-on-ink">Décider</span>
        </Link>
      ))}

      <Card aria-label="Chiffres du jour" className="grid grid-cols-2 gap-px overflow-hidden bg-hairline min-[760px]:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5 bg-surface-raised px-7 py-[22px]">
            <span className="text-sm text-ink-muted">{s.label}</span>
            <span className={`font-display text-4xl leading-10 font-medium tracking-[-0.02em] tabular-nums ${s.tone}`}>{s.value}</span>
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap items-start gap-6">
        <Card className="min-w-0 flex-[999_1_540px] overflow-hidden">
          <div className="px-7 pt-[22px] pb-3.5">
            <CardTitle action={<Link href="/planning" className="text-sm font-semibold">Planning</Link>}>Chantiers du jour</CardTitle>
          </div>
          {d.jobs.length === 0 ? (
            <p className="border-t border-hairline px-7 py-8 text-ink-muted">
              Aucun chantier aujourd&apos;hui. <Link href="/chantiers/nouveau" className="font-semibold">Créer un chantier</Link>
            </p>
          ) : (
            <ul>
              {d.jobs.map((j) => (
                <li key={j.id} className="border-t border-hairline">
                  <Link href={`/chantiers/${j.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-7 py-4 text-ink hover:bg-surface">
                    <span className="w-12 text-sm text-ink-muted tabular-nums">{timeLabel(j.startTime)}</span>
                    <span className="min-w-0 flex-[1_1_220px]">
                      <span className="block font-semibold">{j.title}</span>
                      <span className="block text-sm text-ink-muted">
                        {j.clientName}
                        {j.city ? ` · ${j.city}` : ""}
                      </span>
                    </span>
                    <AvatarStack people={j.team} />
                    <span className="w-24 text-right">
                      <StatusPill status={j.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-6">
          <Card className="flex flex-col gap-4 px-6 py-[22px]">
            <CardTitle>À vérifier</CardTitle>
            {d.toVerify.length === 0 && <p className="text-ink-muted">Rien à vérifier pour l&apos;instant.</p>}
            {d.toVerify.map((v) => (
              <Link key={v.jobId} href={`/chantiers/${v.jobId}`} className="flex items-center gap-3.5 text-ink">
                <span aria-hidden className="size-11 flex-none rounded-md bg-gradient-to-br from-azur-soft to-surface" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{v.clientName}</span>
                  <span className="block text-sm text-ink-muted">
                    {v.finishedAt} · {v.photoCount} photo{v.photoCount > 1 ? "s" : ""}
                  </span>
                </span>
                <ChevronRight aria-hidden size={18} className="text-ink-muted" />
              </Link>
            ))}
          </Card>

          <Card className="flex flex-col gap-4 px-6 py-[22px]">
            <CardTitle>L&apos;équipe en ce moment</CardTitle>
            {d.teamNow.length === 0 && <p className="text-ink-muted">Personne n&apos;est en intervention.</p>}
            {d.teamNow.map((t) => (
              <div key={t.member.id} className="flex items-center gap-3">
                <Avatar {...t.member} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.member.firstName}</span>
                  <span className={`block text-sm ${t.state === "bloque" ? "text-critique" : "text-ink-muted"}`}>{t.detail}</span>
                </span>
                <span aria-hidden className={`size-2 rounded-full ${t.state === "bloque" ? "bg-critique" : "bg-azur"}`} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
