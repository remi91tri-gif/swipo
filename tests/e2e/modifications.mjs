// Modifier un chantier déjà créé (et l'annuler), modifier un client et son adresse.
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
  let job, clientUrl;
  await step("Gérant : Karim, Inès et un chantier à 09:00 pour Karim", async () => {
    await login(g, env("E2E_EMAIL"), env("E2E_PASSWORD"), "**/aujourdhui");
    await g.goto(B + "/equipe");
    for (const [n, tel] of [["Karim", "06 11 22 33 44"], ["Inès", "06 55 66 77 88"]]) {
      await g.fill("#first_name", n);
      await g.fill("#phone", tel);
      await g.getByRole("button", { name: "Ajouter", exact: true }).click();
      await g.getByText(`${n} est ajouté`).waitFor({ timeout: 15000 });
    }
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

  const a = await page({ width: 390, height: 844 });
  await step("Agent Karim : voit sa mission", async () => {
    await login(a, env("E2E_AGENT_EMAIL"), env("E2E_AGENT_PASSWORD"), "**/agent");
    await a.getByText("Ouvrir la mission").waitFor({ timeout: 15000 });
  });

  current = g;
  await step("Gérant : modifie intitulé, horaire, consignes et remplace Karim par Inès", async () => {
    await g.goto(`${B}/chantiers/${job}`);
    await g.getByRole("link", { name: "Modifier" }).click();
    await g.waitForURL(`**/chantiers/${job}/modifier`);
    if ((await g.inputValue("#time")) !== "09:00") throw new Error("horaire non pré-rempli");
    await g.fill("#title", "Vitres et vitrine");
    await g.fill("#time", "10:30");
    await g.fill("#instructions", "Badge à demander à l'accueil.");
    await g.locator("label", { hasText: "Karim" }).last().click();
    await g.locator("label", { hasText: "Inès" }).last().click();
    await g.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await g.waitForURL(/modifie=1/, { timeout: 20000 });
    await g.getByText("Chantier modifié.").waitFor();
    await g.getByRole("heading", { name: "Vitres et vitrine" }).waitFor();
    await g.getByText(/10:30/).first().waitFor();
    await g.getByText("Badge à demander à l'accueil.").waitFor();
    await g.getByText("Inès", { exact: true }).first().waitFor();
    await g.getByText(/Modifié par Marc/).waitFor();
  });

  current = a;
  await step("Agent Karim : prévenu « Mission retirée », la mission disparaît", async () => {
    // La notification recharge déjà la page de l'agent : on attend la fin de ce rechargement.
    await a.waitForTimeout(2500);
    await a.goto(B + "/agent").catch(() => a.goto(B + "/agent"));
    await a.getByRole("button", { name: /^Notifications, \d+ non lue/ }).click();
    await a.getByText("Mission retirée").waitFor({ timeout: 15000 });
    await a.keyboard.press("Escape");
    if (await a.getByText("Ouvrir la mission").count()) throw new Error("mission toujours visible");
  });

  current = g;
  await step("Gérant : annule le chantier", async () => {
    await g.goto(`${B}/chantiers/${job}`);
    await g.getByRole("button", { name: "Annuler le chantier" }).click();
    await g.getByText("Inès sera prévenu.", { exact: false }).waitFor();
    await g.getByRole("button", { name: "Confirmer l'annulation" }).click();
    await g.getByText("Annulé", { exact: true }).first().waitFor({ timeout: 20000 });
    await g.getByText(/Annulé par Marc/).waitFor({ timeout: 15000 });
    if (await g.getByRole("link", { name: "Modifier" }).count()) throw new Error("un chantier annulé reste modifiable");
  });

  await step("Client : modifie nom, contact, e-mail (vérifié)", async () => {
    await g.goto(B + "/clients");
    await g.getByRole("link", { name: /Boulangerie du Port/ }).first().click();
    await g.waitForURL(/\/clients\/[0-9a-f-]{36}/);
    clientUrl = g.url();
    await g.getByRole("button", { name: "Modifier", exact: true }).click();
    await g.fill("#c-nom", "Boulangerie du Vieux-Port");
    await g.fill("#c-contact", "Mme Rossi");
    await g.fill("#c-mail", "pas-un-email");
    await g.getByRole("button", { name: "Enregistrer" }).click();
    // Le navigateur refuse lui-même un e-mail mal écrit.
    if (await g.locator("#c-mail").evaluate((el) => el.validity.valid)) throw new Error("e-mail invalide accepté");
    await g.fill("#c-mail", "contact@boulangerie-port.fr");
    await g.getByRole("button", { name: "Enregistrer" }).click();
    await g.getByRole("heading", { name: "Boulangerie du Vieux-Port" }).waitFor({ timeout: 20000 });
    await g.getByText("Contact : Mme Rossi").first().waitFor();
    await g.getByText("contact@boulangerie-port.fr").waitFor();
  });
  await step("Client : modifie son adresse et l'accès", async () => {
    await g.getByRole("button", { name: /Modifier l'adresse/ }).first().click();
    const f = g.getByRole("form", { name: "Modifier l'adresse" });
    await f.getByLabel("Adresse", { exact: true }).fill("6 quai Lunel, 06300 Nice");
    await f.getByLabel("Accès").fill("Code portail 1906");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await g.getByText("6 quai Lunel, 06300 Nice").waitFor({ timeout: 15000 });
    await g.reload();
    await g.getByText("Code portail 1906").waitFor({ timeout: 15000 });
    if (!g.url().startsWith(clientUrl.split("?")[0])) throw new Error("mauvaise page");
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
