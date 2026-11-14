// Paramètres : photo de profil (gérant et agent), profil, mot de passe, entreprise.
// Usage : mêmes variables que tests/e2e/agent.mjs (comptes à leur première connexion).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const dir = mkdtempSync(join(tmpdir(), "swipo-e2e-"));
const shooter = await page({ width: 600, height: 600 });
await shooter.setContent('<body style="margin:0;background:radial-gradient(circle,#f2b632,#1663a6)"></body>');
const face = join(dir, "visage.jpg");
writeFileSync(face, await shooter.screenshot({ type: "jpeg", quality: 85 }));
const NEW_PASSWORD = "Nouveau-Mot-2026!";

try {
  const g = await page({ width: 1280, height: 900 });
  await step("Gérant : ajoute Karim, ouvre Paramètres depuis sa carte", async () => {
    await login(g, env("E2E_EMAIL"), env("E2E_PASSWORD"), "**/aujourdhui");
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
    await g.getByRole("link", { name: "Mon profil et mes paramètres" }).click();
    await g.waitForURL("**/parametres");
    await g.getByRole("heading", { name: "Paramètres" }).waitFor();
  });
  await step("Gérant : ajoute sa photo, elle remplace ses initiales", async () => {
    await g.getByRole("button", { name: "Ajouter une photo" }).click({ trial: true }); // page prête
    await g.locator('input[type="file"]').first().setInputFiles(face);
    await g.getByRole("button", { name: "Changer la photo" }).waitFor({ timeout: 20000 });
    await g.locator('aside img[src*="/avatars/"]').waitFor({ timeout: 15000 });
  });
  await step("Gérant : modifie son profil", async () => {
    await g.fill("#p-nom", "Testeur");
    await g.getByRole("button", { name: "Enregistrer" }).first().click();
    await g.getByText("Profil enregistré.").waitFor({ timeout: 15000 });
  });
  await step("Mot de passe : refusé si l'actuel est faux, accepté sinon", async () => {
    await g.fill("#mdp-actuel", "mauvais-mot");
    await g.fill("#mdp-nouveau", NEW_PASSWORD);
    await g.fill("#mdp-confirmation", NEW_PASSWORD);
    await g.getByRole("button", { name: "Changer le mot de passe" }).click();
    await g.getByText("Le mot de passe actuel n'est pas le bon.").waitFor({ timeout: 15000 });
    await g.fill("#mdp-actuel", env("E2E_PASSWORD"));
    await g.fill("#mdp-nouveau", NEW_PASSWORD);
    await g.fill("#mdp-confirmation", NEW_PASSWORD);
    await g.getByRole("button", { name: "Changer le mot de passe" }).click();
    await g.getByText("Mot de passe changé.").waitFor({ timeout: 15000 });
  });
  await step("Entreprise : SIRET vérifié, informations enregistrées", async () => {
    await g.fill("#e-siret", "123");
    await g.getByRole("button", { name: "Enregistrer" }).last().click();
    await g.getByText("Le SIRET compte 14 chiffres.").waitFor({ timeout: 15000 });
    await g.fill("#e-siret", "123 456 789 00012");
    await g.fill("#e-adresse", "12 avenue Jean Médecin, 06000 Nice");
    await g.getByRole("button", { name: "Enregistrer" }).last().click();
    await g.getByText("Informations enregistrées.").waitFor({ timeout: 15000 });
    await g.getByText("Essai gratuit jusqu'au").waitFor();
  });
  await step("Reconnexion avec le nouveau mot de passe", async () => {
    const g2 = await page({ width: 1280, height: 900 });
    await login(g2, env("E2E_EMAIL"), NEW_PASSWORD, "**/aujourdhui");
  });

  const a = await page({ width: 390, height: 844 });
  await step("Agent : ajoute sa photo depuis Mon profil", async () => {
    await login(a, env("E2E_AGENT_EMAIL"), env("E2E_AGENT_PASSWORD"), "**/agent");
    await a.getByRole("link", { name: "Mon profil" }).click();
    await a.waitForURL("**/agent/profil");
    await a.getByRole("button", { name: "Ajouter une photo" }).click({ trial: true }); // page prête
    await a.locator('input[type="file"]').first().setInputFiles(face);
    await a.getByRole("button", { name: "Changer la photo" }).waitFor({ timeout: 20000 });
    await a.goto(B + "/agent");
    await a.locator('a[href="/agent/profil"] img[src*="/avatars/"]').waitFor({ timeout: 15000 });
  });
  current = g;
  await step("Gérant : la photo de Karim apparaît dans l'équipe", async () => {
    await g.goto(B + "/equipe");
    await g.locator('li:has-text("Karim") img[src*="/avatars/"]').first().waitFor({ timeout: 15000 });
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
