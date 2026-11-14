import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { Card, LinkButton } from "@/components/ui";
import { hasClientReport } from "@/lib/billing/plans";
import { requireSession } from "@/lib/data";
import { REPORTABLE, getClientReport } from "@/lib/data-report";
import { ReportEditor } from "./report-editor";

export const metadata: Metadata = { title: "Compte rendu client" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (session.member.role !== "gerant") redirect(`/chantiers/${id}`);
  if (!hasClientReport(session.billing)) {
    return (
      <>
        <Link href={`/chantiers/${id}`} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
          <ChevronLeft aria-hidden size={16} /> Retour au chantier
        </Link>
        <Card className="flex flex-col items-start gap-4 p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-azur-subtle text-azur"><FileText aria-hidden size={22} /></span>
          <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.02em]">Le compte rendu client est inclus dans l&apos;offre Pro</h1>
          <p className="max-w-[560px] text-ink-muted">
            Un PDF à votre logo, avec les photos avant/après, les travaux réalisés et vos réserves, prêt à envoyer à votre client par e-mail ou WhatsApp.
            Disponible avec les offres Pro et Business.
          </p>
          <LinkButton href="/abonnement">Voir les offres</LinkButton>
        </Card>
      </>
    );
  }
  const report = await getClientReport(session, id);
  if (!report) notFound();

  return (
    <>
      <Link href={`/chantiers/${id}`} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden size={16} /> {report.title}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-[34px] sm:text-[34px] sm:leading-[42px] font-semibold tracking-[-0.025em]">Compte rendu client</h1>
        <p className="max-w-[640px] text-base text-ink-muted">
          Le document que vous envoyez à {report.clientName}. Il ne contient ni vos notes internes, ni les noms de vos agents.
        </p>
      </div>
      {REPORTABLE.includes(report.status) ? (
        <ReportEditor report={report} />
      ) : (
        <p className="rounded-lg bg-soleil-soft px-5 py-4 text-soleil-ink">Le compte rendu sera disponible quand le chantier sera terminé.</p>
      )}
    </>
  );
}
