// Adresse en trois champs (rue, code postal, ville) et œil des mots de passe.
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/adresse.mjs
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;
const B = process.env.E2E_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const errors = [];
let p;
async function step(name, fn) {
  try {
    await fn();
    console.log("ok  " + name);
  } catch (e) {
    console.log("ÉCHEC " + name + " : " + e.message.split("\n")[0]);
    await p?.screenshot({ path: "e2e-echec.png", fullPage: true });
    throw e;
  }
}
try {
  p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await step("Connexion : l'œil affiche le mot de passe", async () => {
    await p.goto(B + "/connexion");
    await p.fill("#email", process.env.E2E_EMAIL);
    await p.fill("#password", process.env.E2E_PASSWORD);
    await p.getByRole("button", { name: "Afficher le mot de passe" }).click();
    if ((await p.locator("#password").getAttribute("type")) !== "text") throw new Error("mot de passe toujours masqué");
    await p.getByRole("button", { name: "Masquer le mot de passe" }).click();
    if ((await p.locator("#password").getAttribute("type")) !== "password") throw new Error("mot de passe toujours visible");
    await p.getByRole("button", { name: "Se connecter" }).click();
    await p.waitForURL("**/aujourdhui", { timeout: 20000 });
  });
  await step("Nouveau client : le code postal remplit la ville", async () => {
    await p.goto(B + "/clients");
    await p.fill("#name", "Villa Test");
    await p.getByLabel("Adresse d'intervention").fill("18 boulevard de Cimiez");
    await p.getByLabel("Code postal").fill("06000");
    await p.waitForFunction(() => document.querySelector("input[name=city]")?.value === "Nice", null, { timeout: 10000 });
    await p.getByRole("button", { name: "Ajouter le client" }).click();
    await p.waitForURL(/\/clients\/[0-9a-f-]{36}/, { timeout: 20000 });
    await p.getByText("18 boulevard de Cimiez, 06000 Nice").waitFor({ timeout: 10000 });
  });
  await step("Code postal invalide refusé, puis modification de l'adresse", async () => {
    await p.getByRole("button", { name: /Modifier l'adresse/ }).click();
    const form = p.getByRole("form", { name: "Modifier l'adresse" });
    await form.getByLabel("Adresse").fill("5 rue de France");
    await form.getByLabel("Code postal").fill("06400");
    await form.getByLabel("Ville").fill("Cannes");
    await form.getByRole("button", { name: "Enregistrer" }).click();
    await p.getByText("5 rue de France, 06400 Cannes").waitFor({ timeout: 15000 });
  });
  await step("Nouveau chantier avec une nouvelle adresse", async () => {
    await p.goto(B + "/chantiers/nouveau");
    await p.selectOption("#site_id", "new");
    await p.locator("input[name=new_street]").fill("2 place Masséna");
    await p.locator("input[name=new_postal_code]").fill("06000");
    await p.waitForFunction(() => document.querySelector("input[name=new_city]")?.value === "Nice", null, { timeout: 10000 });
    await p.getByRole("button", { name: "Créer le chantier" }).click();
    await p.waitForURL(/\/chantiers\/[0-9a-f-]{36}/, { timeout: 20000 });
    await p.getByText("2 place Masséna, 06000 Nice").first().waitFor({ timeout: 10000 });
  });
  await step("Paramètres : l'œil sur les 3 champs mot de passe", async () => {
    await p.goto(B + "/parametres");
    await p.locator("#mdp-actuel").waitFor({ timeout: 15000 });
    const eyes = p.getByRole("button", { name: "Afficher le mot de passe" });
    if ((await eyes.count()) !== 3) throw new Error(`${await eyes.count()} boutons au lieu de 3`);
  });
  if (errors.length) throw new Error("Erreurs de page : " + errors.join(" | "));
  console.log("Adresse et mots de passe : tout est passé.");
} finally {
  await b.close();
}
