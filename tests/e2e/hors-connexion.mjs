// Lot 6 : l'agent travaille sans réseau, puis tout part au retour du réseau.
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
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.text().startsWith("Swipo :") && console.log("    (console) " + m.text().slice(0, 160)));
  current = p;
  return p;
}

const dir = mkdtempSync(join(tmpdir(), "swipo-e2e-"));
const shooter = await page({ width: 800, height: 600 });
await shooter.setContent('<body style="margin:0;background:linear-gradient(135deg,#1663a6,#f2b632)"></body>');
const photo = join(dir, "photo.jpg");
writeFileSync(photo, await shooter.screenshot({ type: "jpeg", quality: 80 }));

try {
  const g = await page({ width: 1280, height: 900 });
  const jobs = {};
  await step("Gérant : Karim et deux chantiers (photos + checklist à 09:00, 14:00)", async () => {
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
    for (const [key, time] of [["matin", "09:00"], ["aprem", "14:00"]]) {
      await g.goto(B + "/chantiers/nouveau");
      if (key === "matin") {
        await g.selectOption("#client_id", "new");
        await g.fill("#new_client_name", "Résidence Les Pins");
        await g.fill("#new_address", "12 avenue des Pins, 06000 Nice");
      }
      await g.fill("#time", time);
      await g.getByText("Karim", { exact: false }).last().click();
      await g.getByRole("button", { name: "Créer le chantier" }).click();
      await g.waitForURL(/cree=1/, { timeout: 20000 });
      jobs[key] = g.url().split("/chantiers/")[1].split("?")[0];
    }
  });

  const actx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const a = await actx.newPage();
  a.on("pageerror", (e) => errors.push(e.message));
  a.on("console", (m) => m.text().startsWith("Swipo :") && console.log("    (console) " + m.text().slice(0, 160)));
  current = a;
  await step("Agent : connexion, les missions du jour sont gardées sur le téléphone", async () => {
    await a.goto(B + "/connexion");
    await a.fill("#email", env("E2E_AGENT_EMAIL"));
    await a.fill("#password", env("E2E_AGENT_PASSWORD"));
    await a.getByRole("button", { name: "Se connecter" }).click();
    await a.waitForURL("**/agent", { timeout: 20000 });
    await a.waitForFunction(() => document.documentElement.dataset.horsConnexion === "pret", null, { timeout: 60000 });
  });

  let startedOffline;
  await step("Sans réseau : ouvre la mission, démarre, photos, checklist, termine", async () => {
    await actx.setOffline(true);
    await a.goto(`${B}/agent/mission/${jobs.matin}`);
    await a.getByText("Hors connexion.").waitFor({ timeout: 15000 });
    startedOffline = new Date();
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("button", { name: "Terminer" }).waitFor();
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByText(/Il manque/).waitFor();
    const inputs = a.locator('input[type="file"]');
    await inputs.nth(0).setInputFiles(photo);
    await a.getByText("1 photo").first().waitFor({ timeout: 15000 });
    await inputs.nth(1).setInputFiles(photo);
    await a.getByText("1 photo").nth(1).waitFor({ timeout: 15000 });
    const boxes = a.getByRole("checkbox");
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      await boxes.nth(i).click();
      await a.getByText(`${i + 1} sur ${n}`).waitFor();
    }
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor();
    await a.getByText("dès que le réseau revient").waitFor();
  });
  await step("Sans réseau : la page rechargée garde tout (actions en attente)", async () => {
    await a.reload();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
    await a.getByText(/actions? en attente/).waitFor();
  });
  await step("Sans réseau : signalement sur le chantier de 14:00", async () => {
    await a.goto(`${B}/agent`);
    await a.getByText("À envoyer").first().waitFor({ timeout: 15000 });
    await a.goto(`${B}/agent/mission/${jobs.aprem}`);
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("button", { name: "Terminer" }).waitFor();
    await a.getByRole("link", { name: "Signaler un problème" }).click();
    await a.waitForURL(`**/agent/mission/${jobs.aprem}/signaler`);
    await a.fill("#detail", "Pas de réseau au sous-sol, porte du local fermée.");
    await a.getByRole("button", { name: "Envoyer à mon gérant" }).click();
    await a.getByRole("heading", { name: "Enregistré" }).waitFor({ timeout: 15000 });
  });

  await step("Retour du réseau : tout part tout seul", async () => {
    await actx.setOffline(false);
    await a.goto(`${B}/agent/mission/${jobs.matin}`);
    await a.getByText("Votre gérant a reçu le compte rendu").waitFor({ timeout: 60000 });
  });

  current = g;
  await step("Gérant : chantier terminé avec 1 photo avant, 1 après, à l'heure réelle", async () => {
    await g.goto(`${B}/chantiers/${jobs.matin}`);
    await g.getByText("1 avant · 1 après").waitFor({ timeout: 15000 });
    await g.getByText("Terminé").first().waitFor();
    const started = await g.locator("li", { hasText: "Karim démarre" }).locator("span.tabular-nums").innerText();
    const expected = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(startedOffline);
    if (started !== expected) throw new Error(`heure de démarrage ${started}, attendu ${expected}`);
  });
  await step("Gérant : le signalement fait sans réseau est arrivé", async () => {
    await g.goto(`${B}/chantiers/${jobs.aprem}`);
    await g.getByText("IMPRÉVU BLOQUANT").first().waitFor({ timeout: 15000 });
    await g.getByText("Pas de réseau au sous-sol").first().waitFor();
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
