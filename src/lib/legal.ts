/**
 * Informations légales de la société qui édite et vend Swipo.
 *
 * À compléter une fois la société créée. Tant que les champs obligatoires sont vides, les pages
 * « Mentions légales », « Conditions » et « Confidentialité » ne sont pas publiées (page introuvable)
 * et leurs liens n'apparaissent pas.
 */
export const LEGAL = {
  /** Raison sociale, ex. « Swipo SAS ». */
  name: "Rémi Denizot EI",
  /** Forme juridique, ex. « SAS au capital de 1 000 € ». */
  legalForm: "entrepreneur individuel (micro-entreprise), nom commercial « Swipo »",
  /** Adresse du siège. */
  address: "89 boulevard de la Madeleine, 06000 Nice",
  /** SIREN ou numéro RCS, ex. « RCS Nice 123 456 789 ». */
  registration: "SIRET 101 008 415 00016",
  /** Numéro de TVA intracommunautaire (facultatif si non assujetti). */
  vat: "",
  /** Directeur ou directrice de la publication (le représentant légal). */
  director: "Rémi Denizot",
  /** Adresse e-mail de contact (support et données personnelles). */
  email: "contact.swipo@gmail.com",
  /** Téléphone (facultatif). */
  phone: "",
  /** Ville du tribunal compétent (siège), ex. « Nice ». */
  court: "Nice",
};

export const legalReady = [LEGAL.name, LEGAL.legalForm, LEGAL.address, LEGAL.registration, LEGAL.director, LEGAL.email, LEGAL.court].every(
  (v) => v.trim().length > 0,
);

export const LEGAL_UPDATED = "16 novembre 2026";
