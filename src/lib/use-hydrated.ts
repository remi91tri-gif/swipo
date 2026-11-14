"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Vrai une fois la page prête à réagir (après l'hydratation). Un clic sur une action serveur
 * fait juste avant pouvait laisser le bouton bloqué sur « en cours » : on désactive les boutons
 * pendant cette fraction de seconde.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
