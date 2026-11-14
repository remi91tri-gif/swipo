"use client";

import { useState } from "react";
import { setNewPassword } from "@/app/password-actions";
import { Button, Card, Field, FormError } from "@/components/ui";
import { usePending } from "@/lib/use-pending";
import { useHydrated } from "@/lib/use-hydrated";

export function NewPasswordForm() {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = usePending();
  const ready = useHydrated();
  return (
    <Card className="p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setError(null);
            const res = await setNewPassword(next, confirm);
            if (res.error) setError(res.error);
            else window.location.assign(res.url ?? "/aujourdhui");
          });
        }}
      >
        <FormError message={error} />
        <Field id="new-password" name="password" type="password" label="Nouveau mot de passe" autoComplete="new-password" required minLength={8} hint="8 caractères minimum." value={next} onChange={(e) => setNext(e.target.value)} />
        <Field id="confirm-password" name="confirm" type="password" label="Confirmez-le" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" disabled={pending || !ready} className="mt-2 h-12 text-base">
          {pending ? "Enregistrement…" : "Enregistrer et me connecter"}
        </Button>
      </form>
    </Card>
  );
}
