"use client";

import { useCallback, useState } from "react";

/**
 * « En cours » tenu à la main pour les boutons qui appellent une action serveur.
 * (L'indicateur de useTransition pouvait rester bloqué quand la page était rafraîchie
 * en même temps, par exemple à l'arrivée d'une notification.)
 */
export function usePending(): [boolean, (fn: () => Promise<void>) => Promise<void>] {
  const [pending, setPending] = useState(false);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  }, []);
  return [pending, run];
}
