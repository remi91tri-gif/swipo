import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ confirmer?: string; confirme?: string; lien?: string }> }) {
  const { confirmer, confirme, lien } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Connexion</h1>
        <p className="text-ink-muted">Espace gérant</p>
      </div>
      {confirmer && (
        <p role="status" className="rounded-md bg-azur-subtle px-4 py-3 text-sm text-ink">
          Votre compte est créé. Cliquez sur le lien reçu par e-mail pour le confirmer, puis connectez-vous.
        </p>
      )}
      {confirme && (
        <p role="status" className="rounded-md bg-valide-soft px-4 py-3 text-sm font-semibold text-valide">
          Adresse e-mail confirmée. Connectez-vous pour créer votre espace.
        </p>
      )}
      {lien === "expire" && (
        <p role="status" className="rounded-md bg-soleil-soft px-4 py-3 text-sm text-soleil-ink">
          Ce lien a expiré ou a déjà servi. Connectez-vous, ou demandez un nouveau lien.
        </p>
      )}
      <SignInForm />
      <div className="flex flex-col gap-2 text-center text-sm text-ink-muted">
        <p>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold">
            Créer mon entreprise
          </Link>
        </p>
        <p>
          Vous êtes agent ?{" "}
          <Link href="/agent/connexion" className="font-semibold">
            Espace agent
          </Link>
        </p>
      </div>
    </div>
  );
}
