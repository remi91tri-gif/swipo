import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  const { lien } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Mot de passe oublié</h1>
        <p className="text-ink-muted">Recevez un lien pour en choisir un nouveau.</p>
      </div>
      {lien === "expire" && (
        <p role="status" className="rounded-md bg-soleil-soft px-4 py-3 text-sm text-soleil-ink">
          Ce lien a expiré ou a déjà servi. Demandez-en un nouveau ci-dessous.
        </p>
      )}
      <ForgotForm />
      <p className="text-center text-sm text-ink-muted">
        <Link href="/connexion" className="font-semibold">Retour à la connexion</Link>
      </p>
    </div>
  );
}
