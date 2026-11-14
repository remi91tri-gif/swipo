import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL, legalReady } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  if (!legalReady) notFound();
  return (
    <>
      <h1>Mentions légales</h1>
      <h2>Éditeur du site et du service Swipo</h2>
      <p>
        {LEGAL.name}, {LEGAL.legalForm}
        <br />
        Siège : {LEGAL.address}
        <br />
        {LEGAL.registration}
        {LEGAL.vat && (
          <>
            <br />
            TVA intracommunautaire : {LEGAL.vat}
          </>
        )}
        <br />
        Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        {LEGAL.phone && ` · ${LEGAL.phone}`}
      </p>
      <p>Directeur ou directrice de la publication : {LEGAL.director}.</p>
      <h2>Hébergement</h2>
      <p>
        Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com). Les traitements de l&apos;application sont exécutés
        dans la région de Stockholm (Suède).
        <br />
        Données et fichiers : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 (supabase.com), hébergés dans la région de Stockholm (Suède).
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        La marque Swipo, son logo, les textes, interfaces et éléments graphiques du site sont protégés. Toute reproduction sans autorisation écrite
        de {LEGAL.name} est interdite.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Voir la <a href="/confidentialite">politique de confidentialité</a>.
      </p>
    </>
  );
}
