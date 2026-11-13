import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Chantiers" };

export default function Page() {
  return (
    <ComingSoon title="Chantiers" lot="Lot 2">
      La liste des chantiers, filtrée par statut, date et client, arrive au prochain lot.
    </ComingSoon>
  );
}
