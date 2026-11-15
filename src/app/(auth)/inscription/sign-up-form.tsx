"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth-actions";
import { Button, Card, Field, FormError } from "@/components/ui";
import { TRADES } from "@/lib/format";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const f = state?.fields ?? {};
  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-5">
        <FormError message={state?.error} />
        <div className="flex flex-wrap gap-4">
          <Field id="first_name" name="first_name" label="Prénom" autoComplete="given-name" required defaultValue={f.first_name} className="min-w-[140px] flex-1" />
          <Field id="last_name" name="last_name" label="Nom" autoComplete="family-name" defaultValue={f.last_name} className="min-w-[140px] flex-1" />
        </div>
        <Field id="company_name" name="company_name" label="Nom de l'entreprise" autoComplete="organization" required defaultValue={f.company_name} />
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm text-ink-muted">Vos métiers (pour préparer vos modèles de checklist)</legend>
          <div className="flex flex-wrap gap-2">
            {TRADES.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input type="checkbox" name="trades" value={t.id} className="peer sr-only" defaultChecked={t.id === "vitrerie"} />
                <span className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface-raised px-4 text-sm font-semibold text-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--azur)]">
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="phone" name="phone" type="tel" label="Portable (facultatif)" autoComplete="tel" inputMode="tel" placeholder="06 12 34 56 78" defaultValue={f.phone} />
        <Field id="email" name="email" type="email" label="E-mail" autoComplete="email" required defaultValue={f.email} />
        <Field id="password" name="password" type="password" label="Mot de passe" autoComplete="new-password" required minLength={8} hint="8 caractères minimum." />
        <Button type="submit" disabled={pending} className="mt-1 h-12 text-base">
          {pending ? "Création…" : "Créer mon entreprise"}
        </Button>
        <p className="text-center text-[13px] text-ink-muted">
          En créant votre compte, vous acceptez les{" "}
          <a href="/conditions" target="_blank" className="font-semibold underline underline-offset-2">conditions générales</a> et la{" "}
          <a href="/confidentialite" target="_blank" className="font-semibold underline underline-offset-2">politique de confidentialité</a>.
        </p>
      </form>
    </Card>
  );
}
