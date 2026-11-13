import type { AgentDay, Dashboard, Member, Session } from "./types";
import { todayLabel } from "./format";

// Données d'exemple du mode démonstration (les mêmes que la maquette).
const COMPANY = "demo-company";

export const demoMembers: Member[] = [
  { id: "m-marc", companyId: COMPANY, firstName: "Marc", lastName: "Bernard", phone: "+33600000000", email: "marc@exemple.fr", role: "gerant", active: true, hasAccount: true },
  { id: "m-karim", companyId: COMPANY, firstName: "Karim", lastName: "B.", phone: "+33611223344", email: null, role: "agent", active: true, hasAccount: true },
  { id: "m-lea", companyId: COMPANY, firstName: "Léa", lastName: "M.", phone: "+33622334455", email: null, role: "chef", active: true, hasAccount: true },
  { id: "m-yanis", companyId: COMPANY, firstName: "Yanis", lastName: "T.", phone: "+33633445566", email: null, role: "agent", active: true, hasAccount: false },
];

const [, karim, lea, yanis] = demoMembers;
const p = (m: Member) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName });

export const demoSession: Session = {
  company: { id: COMPANY, name: "Éclat Riviera" },
  member: demoMembers[0],
};

export const demoAgentSession: Session = {
  company: demoSession.company,
  member: karim,
};

export function demoAgentDay(): AgentDay {
  return {
    dateLabel: todayLabel(),
    missions: [
      { id: "j2", title: "Remise en état après locataire", address: "27 rue Barla, Nice · 2e étage", startTime: "08:00", status: "planifie", teammates: ["Léa"] },
      { id: "j4", title: "Fin de chantier bureaux", address: "Saint-Laurent-du-Var", startTime: "13:30", status: "planifie", teammates: ["Léa", "Yanis"] },
    ],
  };
}

export function demoDashboard(): Dashboard {
  return {
    dateLabel: todayLabel(),
    jobs: [
      { id: "j1", title: "Vitrerie commerce", clientName: "Boulangerie du Port", city: "Nice", startTime: "07:00", status: "termine", team: [p(yanis)] },
      { id: "j2", title: "Remise en état après locataire", clientName: "Agence Riviera Immobilier", city: "Nice", startTime: "08:00", status: "en_cours", team: [p(karim), p(lea)] },
      { id: "j3", title: "Vitres intérieur et extérieur", clientName: "Villa Ferraro", city: "Villefranche-sur-Mer", startTime: "09:00", status: "a_traiter", team: [p(yanis)] },
      { id: "j4", title: "Fin de chantier bureaux", clientName: "SCI Les Arcades", city: "Saint-Laurent-du-Var", startTime: "13:30", status: "planifie", team: [p(karim), p(lea), p(yanis)] },
      { id: "j5", title: "Nettoyage après déménagement", clientName: "Mme Rossi", city: "Nice", startTime: "14:00", status: "a_planifier", team: [] },
    ],
    blockers: [
      { jobId: "j3", incidentId: "i1", jobTitle: "Accès impossible", place: "Villa Ferraro", reportedBy: "Yanis", reportedAt: "09:12", comment: "Portail fermé, personne ne répond à l'interphone. J'attends devant." },
    ],
    toVerify: [
      { jobId: "j1", clientName: "Boulangerie du Port", finishedAt: "Terminé à 08:02", photoCount: 6 },
      { jobId: "j0", clientName: "Résidence Les Mimosas", finishedAt: "Hier à 17:40", photoCount: 12 },
    ],
    teamNow: [
      { member: p(karim), state: "en_cours", detail: "Remise en état · depuis 08:03" },
      { member: p(lea), state: "en_cours", detail: "Remise en état · depuis 08:05" },
      { member: p(yanis), state: "bloque", detail: "Bloqué · Villa Ferraro" },
    ],
    counts: { prevus: 5, enCours: 1, aTraiter: 1, aVerifier: 2 },
  };
}
