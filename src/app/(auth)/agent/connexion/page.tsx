import type { Metadata } from "next";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { SignInForm } from "../../connexion/sign-in-form";

export const metadata: Metadata = { title: "Connexion agent" };

export default function AgentConnexionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Mes chantiers</h1>
        <p className="text-base text-ink-muted">Espace agent</p>
      </div>
      <SignInForm />
      <div className="flex items-start gap-3 rounded-xl bg-azur-subtle px-4 py-3.5 text-sm text-ink">
        <Link2 aria-hidden size={18} className="mt-0.5 flex-none text-azur" />
        <p>
          <strong>Première connexion ?</strong> Ouvrez le lien envoyé par votre gérant (WhatsApp ou SMS) pour créer votre accès.
          Il a expiré ? Demandez-lui-en un nouveau.
        </p>
      </div>
      <p className="text-center text-sm text-ink-muted">
        Vous êtes gérant ?{" "}
        <Link href="/connexion" className="font-semibold">
          Espace gérant
        </Link>
      </p>
    </div>
  );
}
