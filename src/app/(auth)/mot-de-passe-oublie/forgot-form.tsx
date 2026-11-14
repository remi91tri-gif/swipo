"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/app/password-actions";
import { Button, Card, Field, FormError } from "@/components/ui";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();

  if (sent) {
    return (
      <Card className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-valide-soft text-valide"><MailCheck aria-hidden size={22} /></span>
        <p className="font-semibold">Vérifiez votre boîte mail</p>
        <p className="text-sm text-ink-muted">
          Si un compte existe pour <strong className="text-ink">{email.trim()}</strong>, vous allez recevoir un lien valable 1 heure.
          Pensez à regarder dans les courriers indésirables.
        </p>
        <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-azur hover:underline">Changer d&apos;adresse</button>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setError(null);
            const res = await requestPasswordReset(email);
            if (res.error) setError(res.error);
            else setSent(true);
          });
        }}
      >
        <FormError message={error} />
        <Field id="email" name="email" type="email" label="E-mail du compte" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={pending || !ready} className="mt-2 h-12 text-base">
          {pending ? "Envoi…" : "Recevoir le lien"}
        </Button>
      </form>
    </Card>
  );
}
