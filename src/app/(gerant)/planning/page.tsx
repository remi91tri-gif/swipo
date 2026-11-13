import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Planning" };

export default function Page() {
  return (
    <ComingSoon title="Planning" lot="Lot 2">
      La vue du jour par salarié et par équipe, avec les alertes de chevauchement, arrive avec la création des chantiers.
    </ComingSoon>
  );
}
