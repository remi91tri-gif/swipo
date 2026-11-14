// Notifications : cloche, compteur, bulles en direct et rafraîchissement automatique des écrans.
// Usage : mêmes variables que tests/e2e/agent.mjs (comptes à leur première connexion).
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;

const B = process.env.E2E_URL ?? "http://localhost:3000";
const env = (k) => {
  if (!process.env[k]) throw new Error(`Variable ${k} manquante`);
  return process.env[k];
};
const b = await chromium.launch();
const errors = [];
let current;
async function step(name, fn) {
  try {
    await fn();
    console.log("ok  " + name);
  } catch (e) {
    console.log("ÉCHEC " + name + " : " + e.message.split("\n")[0]);
    await current?.screenshot({ path: "e2e-echec.png", fullPage: true });
    throw e;
  }
}
async function page(viewport) {
  const p = await (await b.newContext({ viewport })).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  current = p;
  return p;
}
async function login(p, email, password, url) {
  await p.goto(B + "/connexion");
  await p.fill("#email", email);
  await p.fill("#password", password);
  await p.getByRole("button", { name: "Se connecter" }).click();
  await p.waitForURL(url, { timeout: 20000 });
}

try {
  const g = await page({ width: 1280, height: 900 });
  let job;
  await step("Gérant : Karim et un chantier sans preuves exigées", async () => {
    await login(g, env("E2E_EMAIL"), env("E2E_PASSWORD"), "**/aujourdhui");
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
    await g.goto(B + "/chantiers/nouveau");
    await g.selectOption("#client_id", "new");
    await g.fill("#new_client_name", "Cabinet Masséna");
    await g.fill("#new_address", "8 place Masséna, 06000 Nice");
    await g.fill("#time", "10:00");
    await g.getByText("Karim", { exact: false }).last().click();
    await g.getByText("Photos avant et après").click();
    await g.getByText("Checklist", { exact: true }).click();
    await g.getByRole("button", { name: "Créer le chantier" }).click();
    await g.waitForURL(/cree=1/, { timeout: 20000 });
    job = g.url().split("/chantiers/")[1].split("?")[0];
    await g.goto(B + "/aujourdhui");
  });

  const a = await page({ width: 390, height: 844 });
  await step("Agent : la cloche annonce sa nouvelle mission", async () => {
    await login(a, env("E2E_AGENT_EMAIL"), env("E2E_AGENT_PASSWORD"), "**/agent");
    await a.getByRole("button", { name: "Notifications, 1 non lue" }).waitFor({ timeout: 15000 });
    await a.getByRole("button", { name: /^Notifications/ }).click();
    await a.getByText("Nouvelle mission").waitFor();
    await a.getByText("Nettoyage de vitres · aujourd'hui à 10:00").waitFor();
    await a.keyboard.press("Escape");
  });

  await step("Agent signale un blocage → bulle en direct chez le gérant, tableau de bord à jour", async () => {
    await a.goto(`${B}/agent/mission/${job}`);
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("button", { name: "Terminer" }).waitFor({ timeout: 15000 });
    await a.getByRole("link", { name: "Signaler un problème" }).click();
    await a.fill("#detail", "Le gardien n'a pas la clé.");
    await a.getByRole("button", { name: "Envoyer à mon gérant" }).click();
    await a.getByRole("heading", { name: "Envoyé" }).waitFor({ timeout: 15000 });
    current = g;
    await g.getByText("Imprévu bloquant").first().waitFor({ timeout: 20000 });
    await g.getByText(/a signalé un problème/).waitFor({ timeout: 20000 });
    await g.getByRole("button", { name: /^Notifications, \d+ non lue/ }).waitFor();
  });

  await step("Gérant répond → l'agent voit la réponse sans recharger", async () => {
    await a.goto(`${B}/agent/mission/${job}`);
    await a.getByText("Problème signalé").waitFor({ timeout: 15000 });
    await g.goto(`${B}/chantiers/${job}`);
    await g.fill("#decision-message", "J'appelle le syndic.");
    await g.getByRole("button", { name: /^Continuer/ }).click();
    await g.getByText("Décision :").waitFor({ timeout: 20000 });
    current = a;
    await a.getByText("Réponse de votre gérant", { exact: true }).waitFor({ timeout: 20000 });
    await a.getByText("Réponse de votre gérant : Continuez le chantier.").waitFor({ timeout: 20000 });
  });

  await step("Agent termine → bulle « Chantier terminé » chez le gérant", async () => {
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
    current = g;
    await g.getByText("Chantier terminé").first().waitFor({ timeout: 20000 });
  });

  await step("Gérant : « Tout marquer comme lu », gardé après rechargement", async () => {
    await g.getByRole("button", { name: /^Notifications/ }).click();
    await g.getByRole("button", { name: "Tout marquer comme lu" }).click();
    await g.getByRole("button", { name: "Notifications", exact: true }).waitFor();
    await g.reload();
    await g.waitForTimeout(2500);
    await g.getByRole("button", { name: "Notifications", exact: true }).waitFor();
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
