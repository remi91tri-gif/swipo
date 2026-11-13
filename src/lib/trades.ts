// Modèles proposés à la création d'un chantier, par métier. Le gérant peut tout modifier.
export const TRADE_PRESETS = [
  {
    id: "vitrerie",
    label: "Vitrerie",
    title: "Nettoyage de vitres",
    duration: 90,
    checklist: ["Vitres extérieures", "Vitres intérieures", "Encadrements et rebords", "Portes vitrées et poignées"],
  },
  {
    id: "fin_de_chantier",
    label: "Fin de chantier",
    title: "Nettoyage de fin de chantier",
    duration: 240,
    checklist: ["Évacuation des déchets légers", "Dépoussiérage complet", "Sols aspirés et lavés", "Vitres et menuiseries", "Sanitaires", "Traces de peinture et d'enduit"],
  },
  {
    id: "remise_en_etat",
    label: "Remise en état",
    title: "Remise en état",
    duration: 240,
    checklist: ["Cuisine et électroménager", "Salle de bain et sanitaires", "Sols et plinthes", "Vitres et rebords", "Placards intérieur", "Prises et interrupteurs"],
  },
  {
    id: "demenagement",
    label: "Après déménagement",
    title: "Nettoyage après déménagement",
    duration: 180,
    checklist: ["Sols et plinthes", "Cuisine et électroménager", "Salle de bain et sanitaires", "Placards intérieur", "Vitres et rebords", "Prises et interrupteurs"],
  },
  {
    id: "sinistre",
    label: "Après sinistre",
    title: "Nettoyage après sinistre",
    duration: 240,
    checklist: ["Évacuation des éléments endommagés", "Nettoyage des surfaces", "Désinfection", "Aération et séchage", "Photos de l'état final"],
  },
  {
    id: "approfondi",
    label: "Nettoyage approfondi",
    title: "Nettoyage approfondi",
    duration: 180,
    checklist: ["Dépoussiérage en hauteur", "Surfaces et mobilier", "Sols", "Sanitaires", "Vitres"],
  },
] as const;

export type TradeId = (typeof TRADE_PRESETS)[number]["id"];

export function tradePreset(id: string) {
  return TRADE_PRESETS.find((t) => t.id === id) ?? TRADE_PRESETS[0];
}
