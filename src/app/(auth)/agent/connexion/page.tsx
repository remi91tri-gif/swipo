import type { Metadata } from "next";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Connexion agent" };

export default function AgentConnexionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Mes chantiers</h1>
        <p className="text-base text-ink-muted">Pas de mot de passe : vous vous connectez avec votre lien personnel.</p>
      </div>
      <Card className="flex flex-col items-center gap-3 p-7 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-azur-subtle text-azur"><Link2 aria-hidden size={22} /></span>
        <p className="font-semibold">Ouvrez le lien envoyé par votre gérant</p>
        <p className="text-ink-muted">Par WhatsApp ou par SMS. Il est valable 7 jours. Il a expiré, ou vous avez changé de téléphone ? Demandez-lui un nouveau lien.</p>
      </Card>
      <p className="text-center text-sm text-ink-muted">
        Vous êtes gérant ?{" "}
        <Link href="/connexion" className="font-semibold">
          Connexion par e-mail
        </Link>
      </p>
    </div>
  );
}
