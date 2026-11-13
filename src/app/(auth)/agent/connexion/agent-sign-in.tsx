"use client";

import { useActionState, useState } from "react";
import { sendAgentCode, verifyAgentCode } from "@/app/auth-actions";
import { Button, Card, Field, FormError } from "@/components/ui";
import { displayPhone } from "@/lib/format";

export function AgentSignIn({ defaultPhone }: { defaultPhone: string }) {
  const [sent, sendAction, sending] = useActionState(sendAgentCode, undefined);
  const [checked, verifyAction, verifying] = useActionState(verifyAgentCode, undefined);
  const [changing, setChanging] = useState(false);

  const phone = checked?.phone ?? sent?.phone;
  const onCodeStep = !changing && (sent?.step === "code" || checked?.step === "code") && !!phone;

  if (onCodeStep) {
    return (
      <Card className="p-6">
        <form action={verifyAction} className="flex flex-col gap-4">
          <p className="text-base">
            Code envoyé par SMS au <span className="font-semibold tabular-nums">{displayPhone(phone)}</span>.
          </p>
          <FormError message={checked?.error} />
          <input type="hidden" name="phone" value={phone} />
          <Field
            id="code"
            name="code"
            label="Code à 6 chiffres"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            autoFocus
            className="[&_input]:text-center [&_input]:font-display [&_input]:text-2xl [&_input]:tracking-[0.3em]"
          />
          <Button type="submit" disabled={verifying} className="h-[58px] rounded-lg text-[17px]">
            {verifying ? "Vérification…" : "Accéder à mes chantiers"}
          </Button>
          <button type="button" onClick={() => setChanging(true)} className="h-11 text-sm font-semibold text-ink-muted">
            Changer de numéro
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form action={(fd) => { setChanging(false); return sendAction(fd); }} className="flex flex-col gap-4">
        <FormError message={sent?.error ?? (changing ? undefined : checked?.error)} />
        <Field
          id="phone"
          name="phone"
          type="tel"
          label="Numéro de portable"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          required
          defaultValue={sent?.fields?.phone ?? (defaultPhone ? displayPhone(defaultPhone) : "")}
          className="[&_input]:text-lg"
        />
        <Button type="submit" disabled={sending} className="h-[58px] rounded-lg text-[17px]">
          {sending ? "Envoi…" : "Recevoir mon code"}
        </Button>
      </form>
    </Card>
  );
}
