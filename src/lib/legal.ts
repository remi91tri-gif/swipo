/**
 * Informations légales de la société qui édite et vend Swipo.
 *
 * À compléter une fois la société créée. Tant que les champs obligatoires sont vides, les pages
 * « Mentions légales », « Conditions » et « Confidentialité » ne sont pas publiées (page introuvable)
 * et leurs liens n'apparaissent pas.
 */
export const LEGAL = {
  /** Raison sociale, ex. « Swipo SAS ». */
  name: "",
  /** Forme juridique, ex. « SAS au capital de 1 000 € ». */
  legalForm: "",
  /** Adresse du siège. */
  address: "",
  /** SIREN ou numéro RCS, ex. « RCS Nice 123 456 789 ». */
  registration: "",
  /** Numéro de TVA intracommunautaire (facultatif si non assujetti). */
  vat: "",
  /** Directeur ou directrice de la publication (le représentant légal). */
  director: "",
  /** Adresse e-mail de contact (support et données personnelles). */
  email: "",
  /** Téléphone (facultatif). */
  phone: "",
  /** Ville du tribunal compétent (siège), ex. « Nice ». */
  court: "",
};

export const legalReady = [LEGAL.name, LEGAL.legalForm, LEGAL.address, LEGAL.registration, LEGAL.director, LEGAL.email, LEGAL.court].every(
  (v) => v.trim().length > 0,
);

export const LEGAL_UPDATED = "15 novembre 2026";
