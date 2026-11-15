"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/auth-actions";
import { Button, Card, Field, FormError } from "@/components/ui";

export function SignInForm({ espace = "gerant" }: { espace?: "gerant" | "agent" }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="espace" value={espace} />
        <FormError message={state?.error} />
        <Field id="email" name="email" type="email" label="E-mail" autoComplete="email" required defaultValue={state?.fields?.email} />
        <Field id="password" name="password" type="password" label="Mot de passe" autoComplete="current-password" required />
        <Link href="/mot-de-passe-oublie" className="-mt-1 self-end text-sm font-semibold text-azur hover:underline">Mot de passe oublié ?</Link>
        <Button type="submit" disabled={pending} className="mt-2 h-12 text-base">
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}
