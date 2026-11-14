import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function NewPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[28px] leading-9 font-semibold tracking-[-0.025em]">Nouveau mot de passe</h1>
        <p className="text-ink-muted">Choisissez-le, puis vous serez connecté.</p>
      </div>
      <NewPasswordForm />
    </div>
  );
}
