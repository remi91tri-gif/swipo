import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Nouveau chantier" };

export default function Page() {
  return (
    <ComingSoon title="Nouveau chantier" lot="Lot 2">
      La création d&apos;un chantier en moins d&apos;une minute (client, adresse, prestation, agents, consignes et preuves demandées) arrive au prochain lot.
    </ComingSoon>
  );
}
