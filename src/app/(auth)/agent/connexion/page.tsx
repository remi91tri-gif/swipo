import type { Metadata } from "next";
import Link from "next/link";
import { AgentSignIn } from "./agent-sign-in";

export const metadata: Metadata = { title: "Connexion agent" };

export default async function AgentConnexionPage({ searchParams }: { searchParams: Promise<{ tel?: string }> }) {
  const { tel } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Mes chantiers</h1>
        <p className="text-base text-ink-muted">Connexion avec votre numéro de portable.</p>
      </div>
      <AgentSignIn defaultPhone={tel ?? ""} />
      <p className="text-center text-sm text-ink-muted">
        Vous êtes gérant ?{" "}
        <Link href="/connexion" className="font-semibold">
          Connexion par e-mail
        </Link>
      </p>
    </div>
  );
}
