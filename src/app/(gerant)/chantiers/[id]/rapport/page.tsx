import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/data";
import { REPORTABLE, getClientReport } from "@/lib/data-report";
import { ReportEditor } from "./report-editor";

export const metadata: Metadata = { title: "Compte rendu client" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (session.member.role !== "gerant") redirect(`/chantiers/${id}`);
  const report = await getClientReport(session, id);
  if (!report) notFound();

  return (
    <>
      <Link href={`/chantiers/${id}`} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden size={16} /> {report.title}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-[42px] font-semibold tracking-[-0.025em]">Compte rendu client</h1>
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
