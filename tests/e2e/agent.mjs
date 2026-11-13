// Parcours complet gérant → agent → gérant sur une instance branchée à Supabase.
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… E2E_AGENT_EMAIL=… E2E_AGENT_PASSWORD=… node tests/e2e/agent.mjs
// Prérequis : un compte gérant à sa première connexion, et un compte agent dont le
// téléphone est +33611223344 (il se connecte ici par e-mail, le SMS n'étant pas testable).
// Playwright préinstallé ailleurs : PLAYWRIGHT_PATH=/chemin/vers/playwright/index.js
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  current = p;
  return p;
}

// Une vraie image JPEG pour simuler l'appareil photo.
const dir = mkdtempSync(join(tmpdir(), "swipo-e2e-"));
const shooter = await page({ width: 800, height: 600 });
await shooter.setContent('<body style="margin:0;background:linear-gradient(135deg,#1663a6,#f2b632)"></body>');
const photo = join(dir, "photo.jpg");
writeFileSync(photo, await shooter.screenshot({ type: "jpeg", quality: 80 }));

try {
  const g = await page({ width: 1280, height: 900 });
  let job1;
  await step("Gérant : connexion et création de l'entreprise", async () => {
    await g.goto(B + "/connexion");
    await g.fill("#email", env("E2E_EMAIL"));
    await g.fill("#password", env("E2E_PASSWORD"));
    await g.getByRole("button", { name: "Se connecter" }).click();
    await g.waitForURL("**/aujourdhui", { timeout: 20000 });
  });
  await step("Gérant : ajout de Karim (06 11 22 33 44)", async () => {
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
  });
  await step("Gérant : chantier avec photos et checklist pour Karim à 09:00", async () => {
    await g.goto(B + "/chantiers/nouveau");
    await g.selectOption("#client_id", "new");
    await g.fill("#new_client_name", "Boulangerie du Port");
    await g.fill("#new_address", "4 quai Lunel, 06300 Nice");
    await g.fill("#time", "09:00");
    await g.getByText("Karim", { exact: false }).last().click();
    await g.getByRole("button", { name: "Créer le chantier" }).click();
    await g.waitForURL(/cree=1/, { timeout: 20000 });
    job1 = g.url().split("/chantiers/")[1].split("?")[0];
  });
  await step("Gérant : second chantier pour Karim à 14:00", async () => {
    await g.goto(B + "/chantiers/nouveau");
    await g.fill("#time", "14:00");
    await g.getByText("Karim", { exact: false }).last().click();
    await g.getByRole("button", { name: "Créer le chantier" }).click();
    await g.waitForURL(/cree=1/, { timeout: 20000 });
  });

  const a = await page({ width: 390, height: 844 });
  await step("Agent : connexion, rattachement à l'équipe par son numéro", async () => {
    await a.goto(B + "/connexion");
    await a.fill("#email", env("E2E_AGENT_EMAIL"));
    await a.fill("#password", env("E2E_AGENT_PASSWORD"));
    await a.getByRole("button", { name: "Se connecter" }).click();
    await a.waitForURL("**/agent", { timeout: 20000 });
    await a.getByRole("heading", { name: "Bonjour Karim" }).waitFor();
  });
  await step("Agent : ouvre la mission de 09:00 et démarre", async () => {
    await a.getByText("Ouvrir la mission").click();
    await a.waitForURL(`**/agent/mission/${job1}`);
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("button", { name: "Terminer" }).waitFor({ timeout: 15000 });
  });
  await step("Agent : terminer sans photos ni checklist est refusé", async () => {
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByText(/Il manque/).waitFor({ timeout: 15000 });
  });
  await step("Agent : photo avant et photo après envoyées", async () => {
    const inputs = a.locator('input[type="file"]');
    await inputs.nth(0).setInputFiles(photo);
    await a.getByText("1 photo").first().waitFor({ timeout: 30000 });
    await inputs.nth(1).setInputFiles(photo);
    await a.getByText("1 photo").nth(1).waitFor({ timeout: 30000 });
    await a.locator('img[alt^="Photo"]').first().waitFor({ timeout: 15000 });
  });
  await step("Agent : checklist cochée en entier", async () => {
    const boxes = a.getByRole("checkbox");
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      await boxes.nth(i).click();
      await a.getByText(`${i + 1} sur ${n}`).waitFor({ timeout: 15000 });
    }
  });
  await step("Agent : termine, écran « C'est net. »", async () => {
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
  });
  await step("Agent : signale un accès impossible sur le chantier de 14:00", async () => {
    await a.goto(B + "/agent");
    await a.getByText("Ouvrir la mission").click();
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("link", { name: "Signaler un problème" }).waitFor({ timeout: 15000 });
    await a.getByRole("link", { name: "Signaler un problème" }).click();
    await a.fill("#detail", "Portail fermé, personne ne répond.");
    await a.getByRole("button", { name: "Envoyer à mon gérant" }).click();
    await a.getByRole("heading", { name: "Envoyé" }).waitFor({ timeout: 15000 });
    await a.getByRole("link", { name: "Revenir à la mission" }).click();
    await a.getByText("Problème signalé").waitFor({ timeout: 15000 });
  });

  current = g;
  await step("Gérant : l'imprévu apparaît sur Aujourd'hui", async () => {
    await g.goto(B + "/aujourdhui");
    await g.getByText(/a signalé un problème/).waitFor({ timeout: 15000 });
  });
  await step("Gérant : la fiche du chantier terminé montre les photos", async () => {
    await g.goto(`${B}/chantiers/${job1}`);
    await g.getByText("1 avant · 1 après").waitFor({ timeout: 15000 });
    await g.getByText("Terminé").first().waitFor();
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
