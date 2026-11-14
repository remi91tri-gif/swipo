// Lot 5 : page d'accueil, compte rendu client (photos choisies, résumé, réserves, logo) et PDF.
// Usage : mêmes variables que tests/e2e/agent.mjs (comptes à leur première connexion).
// Le PDF téléchargé est enregistré dans le dossier courant (compte-rendu-e2e.pdf).
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
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
  const p = await (await b.newContext({ viewport, acceptDownloads: true })).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  current = p;
  return p;
}

const dir = mkdtempSync(join(tmpdir(), "swipo-e2e-"));
const shooter = await page({ width: 800, height: 600 });
await shooter.setContent('<body style="margin:0;background:linear-gradient(135deg,#1663a6,#f2b632)"></body>');
const photo = join(dir, "photo.jpg");
writeFileSync(photo, await shooter.screenshot({ type: "jpeg", quality: 80 }));
await shooter.setViewportSize({ width: 300, height: 120 });
await shooter.setContent('<body style="margin:0;display:flex;align-items:center;justify-content:center;font:700 44px sans-serif;color:#1663a6">AZUR</body>');
const logo = join(dir, "logo.png");
writeFileSync(logo, await shooter.screenshot({ type: "png" }));

try {
  const v = await page({ width: 1280, height: 900 });
  await step("Accueil : la page de présentation mène à l'inscription", async () => {
    await v.goto(B + "/");
    await v.getByRole("heading", { level: 1 }).waitFor();
    await v.getByRole("link", { name: "Essai gratuit" }).click();
    await v.waitForURL("**/inscription");
  });

  const g = await page({ width: 1280, height: 900 });
  let job;
  await step("Gérant : connexion, Karim, chantier avec photos et checklist", async () => {
    await g.goto(B + "/connexion");
    await g.fill("#email", env("E2E_EMAIL"));
    await g.fill("#password", env("E2E_PASSWORD"));
    await g.getByRole("button", { name: "Se connecter" }).click();
    await g.waitForURL("**/aujourdhui", { timeout: 20000 });
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
    await g.goto(B + "/chantiers/nouveau");
    await g.selectOption("#client_id", "new");
    await g.fill("#new_client_name", "Boulangerie du Port");
    await g.fill("#new_address", "4 quai Lunel, 06300 Nice");
    await g.fill("#time", "09:00");
    await g.getByText("Karim", { exact: false }).last().click();
    await g.getByRole("button", { name: "Créer le chantier" }).click();
    await g.waitForURL(/cree=1/, { timeout: 20000 });
    job = g.url().split("/chantiers/")[1].split("?")[0];
  });
  await step("Gérant déjà connecté : /connexion mène à son espace", async () => {
    await g.goto(B + "/connexion");
    await g.waitForURL("**/aujourdhui", { timeout: 15000 });
  });

  const a = await page({ width: 390, height: 844 });
  await step("Agent : 2 photos avant, 1 après, checklist, termine", async () => {
    await a.goto(B + "/connexion");
    await a.fill("#email", env("E2E_AGENT_EMAIL"));
    await a.fill("#password", env("E2E_AGENT_PASSWORD"));
    await a.getByRole("button", { name: "Se connecter" }).click();
    await a.waitForURL("**/agent", { timeout: 20000 });
    await a.goto(`${B}/agent/mission/${job}`);
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("button", { name: "Terminer" }).waitFor({ timeout: 15000 });
    const inputs = a.locator('input[type="file"]');
    await inputs.nth(0).setInputFiles(photo);
    await a.getByText("1 photo").first().waitFor({ timeout: 30000 });
    await inputs.nth(0).setInputFiles(photo);
    await a.getByText("2 photos").first().waitFor({ timeout: 30000 });
    await inputs.nth(1).setInputFiles(photo);
    await a.getByText("1 photo").first().waitFor({ timeout: 30000 });
    const boxes = a.getByRole("checkbox");
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      await boxes.nth(i).click();
      await a.getByText(`${i + 1} sur ${n}`).waitFor({ timeout: 15000 });
    }
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
  });

  current = g;
  await step("Gérant : ouvre le compte rendu client depuis la fiche", async () => {
    await g.goto(`${B}/chantiers/${job}`);
    await g.getByRole("link", { name: "Compte rendu client" }).click();
    await g.waitForURL(`**/chantiers/${job}/rapport`);
    await g.getByRole("heading", { name: "Compte rendu client" }).waitFor();
    await g.getByText("3 sur 3").waitFor();
  });
  await step("Gérant : retire une photo, écrit résumé et réserves, ajoute son logo", async () => {
    await g.getByRole("checkbox", { name: "Photo avant 2" }).click();
    await g.getByText("2 sur 3").waitFor();
    await g.fill("#summary", "Nettoyage complet de la vitrine, intérieur et extérieur.");
    await g.fill("#reservations", "Calcaire ancien en bas de vitrine : traitement conseillé.");
    await g.getByText("Calcaire ancien en bas de vitrine").last().waitFor();
    await g.locator('input[type="file"]').setInputFiles(logo);
    await g.locator('img[alt^="Logo"]').waitFor({ timeout: 20000 });
  });
  await step("Gérant : télécharge le PDF", async () => {
    const [dl] = await Promise.all([g.waitForEvent("download", { timeout: 60000 }), g.getByRole("button", { name: "Télécharger le PDF" }).click()]);
    if (!/^compte-rendu-boulangerie-du-port-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename())) throw new Error("nom inattendu " + dl.suggestedFilename());
    await dl.saveAs("compte-rendu-e2e.pdf");
    const head = readFileSync("compte-rendu-e2e.pdf").subarray(0, 5).toString();
    if (head !== "%PDF-") throw new Error("ce n'est pas un PDF");
    await g.getByText("Dernier envoi").waitFor({ timeout: 15000 });
  });
  await step("Gérant : les choix sont conservés au rechargement", async () => {
    await g.reload();
    await g.getByText("2 sur 3").waitFor();
    if ((await g.inputValue("#summary")) !== "Nettoyage complet de la vitrine, intérieur et extérieur.") throw new Error("résumé perdu");
  });
  await step("Agent : n'accède pas au PDF", async () => {
    // Requête faite depuis la page de l'agent (avec sa session), comme le ferait son navigateur.
    const res = await a.evaluate(async (u) => {
      const r = await fetch(u, { redirect: "manual" });
      return { status: r.status, type: r.headers.get("content-type") };
    }, `/chantiers/${job}/rapport/pdf`);
    if (res.status === 200 && res.type === "application/pdf") throw new Error("PDF accessible à l'agent");
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
