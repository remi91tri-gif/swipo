import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/data";
import { cityOf, getClients } from "@/lib/data-jobs";
import { CLIENT_TYPE_LABEL } from "@/lib/format";
import { NewClientForm } from "./new-client-form";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await getClients(session);

  return (
    <>
      <PageHeader title="Clients" lead={`${clients.length} client${clients.length > 1 ? "s" : ""}. Chaque client peut avoir plusieurs adresses.`} />
      <div className="flex flex-wrap items-start gap-6">
        <Card className="min-w-0 flex-[999_1_520px] overflow-hidden">
          {clients.length === 0 ? (
            <p className="px-7 py-8 text-ink-muted">Aucun client pour l&apos;instant. Ajoutez le premier avec le formulaire, ou directement en créant un chantier.</p>
          ) : (
            <ul>
              {clients.map((c) => (
                <li key={c.id} className="border-t border-hairline first:border-t-0">
                  <Link href={`/clients/${c.id}`} className="flex items-center gap-4 px-7 py-4 text-ink hover:bg-surface">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block text-sm text-ink-muted">
                        {CLIENT_TYPE_LABEL[c.type]}
                        {c.sites[0] ? ` · ${cityOf(c.sites[0].address)}` : ""}
                        {c.sites.length > 1 ? ` · ${c.sites.length} adresses` : ""}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={18} className="text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 p-6">
          <CardTitle>Nouveau client</CardTitle>
          <NewClientForm />
        </Card>
      </div>
    </>
  );
}
