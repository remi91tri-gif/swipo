"use client";

import { useState } from "react";
import { isDemo } from "@/lib/env";
import { browserClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

/** Connecte ce téléphone (session sans mot de passe) puis le rattache à la fiche de l'agent. */
export function JoinButton({ token }: { token: string }) {
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
      window.location.href = role === "agent" ? "/agent" : "/aujourdhui";
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="rounded-lg bg-critique-soft px-4 py-3 text-left font-semibold text-critique">{error}</p>}
      <button type="button" onClick={join} disabled={pending || !ready} className="h-[56px] rounded-lg bg-azur text-[17px] font-semibold text-on-azur shadow-card disabled:opacity-60">
        {pending ? "Connexion…" : "Rejoindre mon équipe"}
      </button>
    </div>
  );
}
