import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL, legalReady } from "@/lib/legal";

export const metadata: Metadata = { title: "Confidentialité" };

export default function Confidentialite() {
  if (!legalReady) notFound();
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p>
        Cette politique explique quelles données Swipo traite, pourquoi, et quels sont vos droits. Contact pour toute question :{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>1. Qui est responsable ?</h2>
      <ul>
        <li>
          Pour les comptes des entreprises clientes (gérants), la facturation et le site : {LEGAL.name}, {LEGAL.address}, responsable de traitement.
        </li>
        <li>
          Pour les données que les entreprises saisissent dans Swipo (leurs salariés, leurs clients, chantiers et photos) : l&apos;entreprise cliente est
          responsable de traitement, et Swipo est son sous-traitant.
        </li>
      </ul>

      <h2>2. Données traitées</h2>
      <ul>
        <li>Gérant : nom, prénom, e-mail, téléphone, nom de l&apos;entreprise, données de facturation (le numéro de carte est traité uniquement par Stripe).</li>
        <li>Salariés : prénom, nom, téléphone, rôle, actions réalisées sur les chantiers et leur heure, photos prises, signalements.</li>
        <li>Clients de l&apos;entreprise : nom, coordonnées, adresses des chantiers, consignes d&apos;accès saisies par l&apos;entreprise.</li>
        <li>Données techniques : journaux de connexion nécessaires à la sécurité.</li>
      </ul>
      <p>Swipo n&apos;utilise aucune géolocalisation, aucune publicité et ne vend aucune donnée.</p>

      <h2>3. Pourquoi ?</h2>
      <ul>
        <li>Fournir le service (exécution du contrat).</li>
        <li>Facturer l&apos;abonnement et tenir la comptabilité (obligation légale).</li>
        <li>Sécuriser le service et prévenir les abus (intérêt légitime).</li>
      </ul>

      <h2>4. Combien de temps ?</h2>
      <ul>
        <li>Pendant l&apos;abonnement, puis 90 jours après sa fin, avant suppression définitive (sauf demande de suppression immédiate).</li>
        <li>Factures : 10 ans (obligation comptable).</li>
        <li>Journaux techniques : 12 mois au plus.</li>
      </ul>

      <h2>5. Qui y a accès ?</h2>
      <p>Les membres de l&apos;entreprise selon leur rôle, et nos prestataires techniques, liés par contrat :</p>
      <ul>
        <li>Supabase (base de données et fichiers), hébergement en Suède.</li>
        <li>Vercel (hébergement de l&apos;application), traitements en Suède ; société américaine, transferts encadrés par les clauses contractuelles types de la Commission européenne.</li>
        <li>Stripe (paiement), pour la facturation uniquement.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        Swipo n&apos;utilise que des éléments strictement nécessaires : le cookie de connexion, et la mémorisation sur l&apos;appareil du thème choisi et des
        actions faites sans réseau. Aucun cookie publicitaire ni de mesure d&apos;audience : aucun consentement n&apos;est donc demandé.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Vous pouvez demander l&apos;accès à vos données, leur rectification, leur suppression, leur portabilité, ou vous opposer à un traitement, en écrivant à{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Si vous êtes salarié ou client d&apos;une entreprise utilisatrice, adressez-vous d&apos;abord à elle ;
        nous l&apos;aiderons à vous répondre. Vous pouvez aussi saisir la CNIL (cnil.fr).
      </p>
    </>
  );
}
