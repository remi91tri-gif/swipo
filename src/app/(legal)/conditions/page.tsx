import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL, legalReady } from "@/lib/legal";
import { VAT_FREE, HT, PLANS, TRIAL_DAYS, euros, price } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Conditions générales" };

export default function Conditions() {
  if (!legalReady) notFound();
  return (
    <>
      <h1>Conditions générales d&apos;utilisation et de vente</h1>
      <p>
        Les présentes conditions régissent l&apos;accès au service Swipo, édité par {LEGAL.name} (« Swipo »), par les entreprises qui y créent un compte
        (le « Client »). Le service est réservé aux professionnels. Créer un compte vaut acceptation de ces conditions.
      </p>

      <h2>1. Le service</h2>
      <p>
        Swipo est un logiciel en ligne de suivi de chantiers : planning, missions des salariés sur téléphone, photos, checklists, imprévus,
        validation et comptes rendus clients. Il est accessible depuis un navigateur, sans installation.
      </p>

      <h2>2. Compte et accès</h2>
      <ul>
        <li>Le gérant crée le compte de l&apos;entreprise et reste responsable des accès qu&apos;il donne à ses salariés (liens de connexion personnels).</li>
        <li>Le Client garde ses identifiants confidentiels et prévient Swipo de toute utilisation non autorisée.</li>
        <li>Le Client désactive sans délai l&apos;accès d&apos;un salarié qui quitte l&apos;entreprise.</li>
      </ul>

      <h2>3. Essai gratuit</h2>
      <p>
        Chaque nouvelle entreprise bénéficie d&apos;un essai gratuit de {TRIAL_DAYS} jours, sans carte bancaire. À la fin de l&apos;essai, l&apos;accès est mis
        en pause jusqu&apos;à la souscription d&apos;une offre ; les données sont conservées.
      </p>

      <h2>4. Offres et prix</h2>
      <ul>
        {PLANS.map((p) => (
          <li key={p.id}>
            {p.name} : {euros(price(p.id, "month"))}{HT} par mois, ou {euros(price(p.id, "year"))}{HT} par an (un mois offert) : {p.seats}{p.clientReport ? ", comptes rendus clients en PDF" : ""}.
          </li>
        ))}
      </ul>
      <p>
        {VAT_FREE ? "TVA non applicable, art. 293 B du CGI : les prix indiqués sont les prix payés." : "Les prix s'entendent hors taxes ; la TVA applicable est ajoutée."} Swipo peut faire évoluer ses prix ; le Client en est informé au moins
        30 jours avant leur application à son abonnement et peut résilier avant cette date.
      </p>

      <h2>5. Programme pilote</h2>
      <p>
        Les entreprises admises au programme pilote utilisent Swipo gratuitement pendant la durée indiquée lors de leur admission, en échange de
        retours réguliers. Elles bénéficient ensuite d&apos;une réduction de 50 % sur l&apos;offre de leur choix, tant que l&apos;abonnement n&apos;est pas résilié.
      </p>

      <h2>6. Paiement</h2>
      <p>
        L&apos;abonnement est payable d&apos;avance, chaque mois ou chaque année, par carte bancaire via notre prestataire de paiement Stripe. Les factures
        sont disponibles dans l&apos;espace « Abonnement ». En cas d&apos;échec de paiement, l&apos;accès peut être suspendu après relance.
      </p>

      <h2>7. Durée et résiliation</h2>
      <p>
        L&apos;abonnement est sans engagement au-delà de la période payée et se renouvelle automatiquement. Le Client peut le résilier à tout moment
        depuis l&apos;espace « Abonnement » ; la résiliation prend effet à la fin de la période en cours, sans remboursement de la période entamée. Après
        la fin de l&apos;abonnement, les données du Client sont conservées 90 jours pour lui permettre de revenir, puis supprimées. Le Client peut
        demander leur suppression immédiate.
      </p>

      <h2>8. Disponibilité</h2>
      <p>
        Swipo met en œuvre les moyens raisonnables pour assurer l&apos;accès au service 24 h/24 et 7 j/7, hors maintenance et incidents indépendants de sa
        volonté. Les actions faites sans réseau par les salariés sont envoyées au retour du réseau.
      </p>

      <h2>9. Données du Client</h2>
      <p>
        Le Client reste propriétaire des données qu&apos;il saisit (clients, chantiers, photos, comptes rendus). Pour les données personnelles de ses salariés
        et de ses propres clients, le Client est responsable de traitement et Swipo agit comme sous-traitant, uniquement pour fournir le service,
        conformément à l&apos;article 28 du RGPD. Le détail figure dans la <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        Swipo est un outil d&apos;organisation : le Client reste seul responsable de l&apos;exécution de ses prestations et des documents qu&apos;il transmet à ses
        clients. La responsabilité de Swipo, si elle est engagée, est limitée aux sommes payées par le Client au cours des douze derniers mois.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. À défaut d&apos;accord amiable, tout litige relève des tribunaux de {LEGAL.court}.
        Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </>
  );
}
