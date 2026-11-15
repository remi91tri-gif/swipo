"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { usePending } from "@/lib/use-pending";
import { joinWithAccount } from "./actions";
import { isDemo } from "@/lib/env";
import { browserClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

/** Connecte ce téléphone (session sans mot de passe) puis le rattache à la fiche de l'agent. */
function DeviceJoin({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = useHydrated();

  async function join() {
    setPending(true);
    setError(null);
    try {
      if (isDemo) {
        window.location.href = "/agent";
        return;
      }
      const sb = browserClient();
      const { data: current } = await sb.auth.getSession();
      if (current.session) await sb.auth.signOut({ scope: "local" });
      const { error: signErr } = await sb.auth.signInAnonymously();
      if (signErr) throw new Error(/disabled/i.test(signErr.message) ? "La connexion par lien n'est pas encore activée. Prévenez votre gérant." : "Connexion impossible. Vérifiez votre réseau et réessayez.");
      const { data: role, error: claimErr } = await sb.rpc("claim_invite", { p_token: token });
      if (claimErr) {
        await sb.auth.signOut({ scope: "local" });
        throw new Error(/plus valable/.test(claimErr.message) ? claimErr.message : "Le lien n'a pas pu être utilisé. Réessayez.");
      }
      void role;
      window.location.href = "/agent";
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="rounded-lg bg-critique-soft px-4 py-3 text-left font-semibold text-critique">{error}</p>}
      <button type="button" onClick={join} disabled={pending || !ready} className="h-12 rounded-lg border border-line-strong bg-surface-raised text-[15px] font-semibold text-ink disabled:opacity-60">
        {pending ? "Connexion…" : "Rejoindre mon équipe"}
      </button>
    </div>
  );
}

const field = "h-12 w-full rounded-md border border-line-strong bg-surface-raised px-3.5 text-[16px] text-ink";

/** L'agent choisit son e-mail et son mot de passe ; à défaut, ce téléphone seul est connecté. */
export function JoinButton({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [withoutEmail, setWithoutEmail] = useState(false);
  const [pending, run] = usePending();
  const ready = useHydrated();

  if (withoutEmail) {
    return (
      <div className="flex flex-col gap-3 text-left">
        <p className="text-sm text-ink-muted">Ce téléphone restera connecté. Si vous changez de téléphone, il faudra un nouveau lien de votre gérant.</p>
        <DeviceJoin token={token} />
        <button type="button" onClick={() => setWithoutEmail(false)} className="text-sm font-semibold text-azur">Créer plutôt mon accès avec un e-mail</button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setError(null);
          const res = await joinWithAccount(token, email, password, confirm);
          if (res.error) setError(res.error);
          else window.location.href = res.url ?? "/agent";
        });
      }}
    >
      {error && <p role="alert" className="rounded-lg bg-critique-soft px-4 py-3 font-semibold text-critique">{error}</p>}
      <div><label htmlFor="join-email" className="mb-1.5 block text-sm text-ink-muted">Votre e-mail</label><input id="join-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
      <div><label htmlFor="join-password" className="mb-1.5 block text-sm text-ink-muted">Choisissez un mot de passe</label><PasswordInput id="join-password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></div>
      <div><label htmlFor="join-confirm" className="mb-1.5 block text-sm text-ink-muted">Confirmez-le</label><PasswordInput id="join-confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} /></div>
      <p className="text-[13px] text-ink-muted">8 caractères minimum. Vous pourrez vous reconnecter depuis n&apos;importe quel téléphone.</p>
      <button type="submit" disabled={pending || !ready} className="mt-1 h-[56px] rounded-lg bg-azur text-[17px] font-semibold text-on-azur shadow-card disabled:opacity-60">
        {pending ? "Création…" : "Créer mon accès et rejoindre"}
      </button>
      <button type="button" onClick={() => setWithoutEmail(true)} className="text-sm font-semibold text-ink-muted hover:text-ink">Je n&apos;ai pas d&apos;e-mail : continuer sans</button>
    </form>
  );
}
