/** Adresse complète affichée partout : « 18 bd de Cimiez, 06000 Nice ». */
export function fullAddress(street: string, postalCode: string, city: string) {
  return `${street.trim()}, ${postalCode.trim()} ${city.trim()}`;
}

/** Vérifie les trois champs d'une adresse ; renvoie un message d'erreur ou null. */
export function addressError(a: { street: string; postalCode: string; city: string }) {
  if (!a.street.trim()) return "Indiquez l'adresse (numéro et rue).";
  if (!/^\d{5}$/.test(a.postalCode.trim())) return "Le code postal compte 5 chiffres.";
  if (!a.city.trim()) return "Indiquez la ville.";
  return null;
}

/** Les trois champs d'adresse d'un formulaire, avec un préfixe éventuel (« new_ »). */
export function readAddress(fd: FormData, prefix = "") {
  const g = (k: string) => String(fd.get(prefix + k) ?? "").trim();
  return { street: g("street"), postalCode: g("postal_code"), city: g("city") };
}
