"use client";

/**
 * Rafraîchir la page pendant qu'une action serveur est en cours peut la laisser bloquée sur
 * « en cours ». On compte donc les actions en vol (requêtes portant l'en-tête « Next-Action »)
 * et on ne rafraîchit qu'une fois qu'il n'y en a plus.
 */
let inFlight = 0;
let waiting: (() => void)[] = [];
let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const h = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!h.has("next-action")) return original(input, init);
    inFlight++;
    try {
      return await original(input, init);
    } finally {
      // La réponse d'une action est lue juste après : on laisse le temps au routeur de l'appliquer.
      setTimeout(() => {
        inFlight--;
        if (inFlight === 0) {
          const run = waiting;
          waiting = [];
          run.forEach((fn) => fn());
        }
      }, 400);
    }
  };
}

export function whenIdle(fn: () => void) {
  install();
  if (inFlight === 0) fn();
  else if (!waiting.includes(fn)) waiting.push(fn);
}

export function watchActions() {
  install();
}
