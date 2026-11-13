"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth-actions";
import { Button, Card, Field, FormError } from "@/components/ui";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state?.error} />
        <Field id="email" name="email" type="email" label="E-mail" autoComplete="email" required defaultValue={state?.fields?.email} />
        <Field id="password" name="password" type="password" label="Mot de passe" autoComplete="current-password" required />
        <Button type="submit" disabled={pending} className="mt-2 h-12 text-base">
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}
