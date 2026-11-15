"use client";

import { useEffect } from "react";
import { CloudOff, LogOut, RefreshCw, TriangleAlert, X } from "lucide-react";
import { clearAll, list } from "@/lib/offline/queue";
import { dismissFailure, useQueueRunner, useSyncState } from "@/lib/offline/sync";

/** Installe le service worker et lance l'envoi des gestes en attente. Affiche l'état du réseau. */
export function OfflineAgent() {
  useQueueRunner();
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const s = useSyncState();

  if (s.failure) {
    return (
      <div role="alert" className="mx-4 mt-3 flex items-start gap-3 rounded-xl bg-critique-soft px-4 py-3 text-[15px] text-critique">
        <TriangleAlert aria-hidden size={18} className="mt-0.5 flex-none" />
        <p className="flex-1 font-semibold">{s.failure}</p>
        <button type="button" onClick={dismissFailure} aria-label="Fermer" className="-m-1 p-1"><X aria-hidden size={18} /></button>
      </div>
    );
  }
  if (s.needsLogin) {
    return (
      <p role="status" className="mx-4 mt-3 rounded-xl bg-soleil-soft px-4 py-3 text-[15px] font-semibold text-soleil-ink">
        Session expirée : reconnectez-vous pour envoyer {s.pending > 1 ? `vos ${s.pending} actions` : "votre action"} en attente.
      </p>
    );
  }
  if (!s.online) {
    return (
      <p role="status" className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-[15px] text-on-ink">
        <CloudOff aria-hidden size={18} className="flex-none" />
        <span>
          <span className="font-semibold">Hors connexion.</span>{" "}
          {s.pending ? `${s.pending} action${s.pending > 1 ? "s" : ""} en attente, envoi automatique au retour du réseau.` : "Vous pouvez continuer à travailler."}
        </span>
      </p>
    );
  }
  if (s.pending > 0) {
    return (
      <p role="status" className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-azur-subtle px-4 py-3 text-[15px] font-semibold text-azur">
        <RefreshCw aria-hidden size={16} className="flex-none animate-spin" /> Envoi de {s.pending} action{s.pending > 1 ? "s" : ""}…
      </p>
    );
  }
  return null;
}

/**
 * Garde sur le téléphone la liste du jour et chaque mission (avec son écran de signalement),
 * pour pouvoir les ouvrir sans réseau. Une fois par visite, quand le réseau est là.
 */
export function KeepMissionsOffline({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) return;
    let cancelled = false;
    const run = async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((r) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => r(), { once: true });
          setTimeout(r, 3000);
        });
      }
      if (cancelled || !navigator.serviceWorker.controller) return;
      const urls = ["/agent", ...key.split(",").filter(Boolean).flatMap((id) => [`/agent/mission/${id}`, `/agent/mission/${id}/signaler`])];
      for (const u of urls) {
        if (cancelled) return;
        await fetch(u, { credentials: "same-origin", headers: { Accept: "text/html" } }).catch(() => {});
      }
      document.documentElement.dataset.horsConnexion = "pret";
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return null;
}

/** Avant la déconnexion : prévient s'il reste des actions non envoyées, puis efface ce qui est gardé. */
export async function beforeAgentSignOut(): Promise<boolean> {
  const pending = (await list()).length;
  const msg =
    pending === 1
      ? "Une action n'a pas encore été envoyée. Si vous vous déconnectez maintenant, elle sera perdue. Se déconnecter quand même ?"
      : `${pending} actions n'ont pas encore été envoyées. Si vous vous déconnectez maintenant, elles seront perdues. Se déconnecter quand même ?`;
  const back = "Pour revenir : reconnectez-vous avec votre e-mail, ou demandez un nouveau lien à votre gérant.";
  if (!window.confirm(pending > 0 ? `${msg}\n\n${back}` : `Se déconnecter ? ${back}`)) return false;
  await clearAll().catch(() => {});
  navigator.serviceWorker?.controller?.postMessage("effacer");
  return true;
}

/** Bouton de déconnexion de l'espace agent. */
export function AgentSignOut({ action }: { action: () => Promise<void> }) {
  return (
    <button
      type="button"
      aria-label="Se déconnecter"
      onClick={async () => {
        if (await beforeAgentSignOut()) await action();
      }}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-ink-muted"
    >
      <LogOut aria-hidden size={16} />
    </button>
  );
}
