import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone, Plus } from "lucide-react";
import { JobRow } from "@/components/job-row";
import { Card, CardTitle, LinkButton, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { getClientWithJobs } from "@/lib/data-jobs";
import { CLIENT_TYPE_LABEL, displayPhone } from "@/lib/format";
import { AddSiteForm } from "./add-site-form";
import { EditClient, SiteItem } from "./client-edit";

export const metadata: Metadata = { title: "Fiche client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const res = await getClientWithJobs(session, id);
  if (!res) notFound();
  const { client, jobs } = res;

  return (
    <>
      <Link href="/clients" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft aria-hidden size={16} /> Clients
      </Link>
      <PageHeader
        eyebrow={CLIENT_TYPE_LABEL[client.type].toUpperCase()}
        title={client.name}
        lead={client.contactName ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {session.member.role === "gerant" && <EditClient client={client} />}
            <LinkButton href={`/chantiers/nouveau?client=${client.id}`}>
              <Plus aria-hidden size={16} strokeWidth={2.25} /> Nouveau chantier
            </LinkButton>
          </div>
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <Card className="overflow-hidden">
            <div className="px-7 pt-[22px] pb-3.5"><CardTitle>Historique des chantiers</CardTitle></div>
            {jobs.length === 0 ? (
              <p className="border-t border-hairline px-7 py-6 text-ink-muted">Aucun chantier pour ce client.</p>
            ) : (
              <ul>{jobs.map((j) => <JobRow key={j.id} job={j} showDate />)}</ul>
            )}
          </Card>
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          {(client.phone || client.email || client.notes || client.contactName) && (
            <Card className="flex flex-col gap-3 p-6">
              <CardTitle>Coordonnées</CardTitle>
              {client.phone && <p className="flex items-center gap-3"><Phone aria-hidden size={17} className="text-ink-muted" /><span className="tabular-nums">{displayPhone(client.phone)}</span></p>}
              {client.email && <p className="flex items-center gap-3 break-all"><Mail aria-hidden size={17} className="flex-none text-ink-muted" />{client.email}</p>}
              {client.contactName && <p className="text-ink-muted">Contact : {client.contactName}</p>}
              {client.notes && <p className="text-ink-muted">{client.notes}</p>}
            </Card>
          )}
          <Card className="flex flex-col gap-4 p-6">
            <CardTitle>Adresses</CardTitle>
            {client.sites.map((s) => (
              <SiteItem key={s.id} clientId={client.id} site={s} />
            ))}
            <AddSiteForm clientId={client.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
