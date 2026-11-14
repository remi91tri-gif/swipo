import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Créer mon entreprise" };

export default function InscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Créer mon entreprise</h1>
        <p className="text-ink-muted">14 jours d&apos;essai gratuit, sans carte bancaire.</p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
