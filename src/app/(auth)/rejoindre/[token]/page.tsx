import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "Rejoindre votre équipe" };
export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let info: { first_name: string; company_name: string } | null = null;
  if (isDemo) info = { first_name: "Karim", company_name: "Éclat Riviera" };
  else {
    const supabase = await createClient();
    const { data } = await supabase.rpc("invite_info", { p_token: token });
    info = (data as { first_name: string; company_name: string }[] | null)?.[0] ?? null;
  }

  if (!info) {
    return (
      <Card className="flex flex-col gap-3 p-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Ce lien n&apos;est plus valable</h1>
        <p className="text-ink-muted">Il a déjà servi ou a expiré (7 jours). Demandez à votre gérant de vous en envoyer un nouveau depuis Swipo.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] leading-8 font-semibold tracking-[-0.02em]">Bonjour {info.first_name}</h1>
        <p className="text-ink-muted">
          <strong className="text-ink">{info.company_name}</strong> vous invite sur Swipo. Vous y retrouverez les chantiers, les adresses et les consignes.
        </p>
      </div>
      <JoinButton token={token} />
    </Card>
  );
}
