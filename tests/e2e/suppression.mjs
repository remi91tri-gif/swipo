// Suppression de compte : un agent supprime son compte, puis le gérant supprime toute son entreprise.
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… E2E_COMPANY=… node tests/e2e/suppression.mjs
// Prérequis : un compte gérant à sa première connexion (l'entreprise E2E_COMPANY est créée alors).
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;
const B = process.env.E2E_URL ?? "http://localhost:3000";
const { E2E_EMAIL, E2E_PASSWORD, E2E_COMPANY } = process.env;
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
try {
  const g = await page({ width: 1280, height: 900 });
  let link;
  await step("Gérant : ajoute Karim et crée son lien", async () => {
    await g.goto(B + "/connexion");
    await g.fill("#email", E2E_EMAIL);
    await g.fill("#password", E2E_PASSWORD);
    await g.getByRole("button", { name: "Se connecter" }).click();
    await g.waitForURL("**/aujourdhui", { timeout: 20000 });
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
    await g.getByRole("button", { name: "Créer le lien de connexion" }).click();
    await g.getByRole("link", { name: "WhatsApp" }).waitFor({ timeout: 15000 });
    link = await g.locator("[data-invite-link]").inputValue();
  });

  const a = await page({ width: 390, height: 844 });
  await step("Agent : rejoint puis supprime son compte", async () => {
    await a.goto(link);
    await a.getByRole("button", { name: "Rejoindre mon équipe" }).click();
    await a.waitForURL("**/agent", { timeout: 20000 });
    await a.goto(B + "/agent/profil");
    await a.getByRole("button", { name: "Supprimer mon compte" }).click();
    await a.getByRole("button", { name: "Supprimer", exact: true }).click();
    await a.waitForURL((u) => new URL(u).pathname === "/", { timeout: 20000 });
    await a.goto(B + "/agent");
    await a.waitForURL("**/agent/connexion", { timeout: 15000 });
  });

  current = g;
  await step("Gérant : Karim n'a plus d'accès", async () => {
    await g.goto(B + "/equipe");
    await g.getByText("Karim").first().waitFor();
    if (await g.getByText("Connecté", { exact: true }).count()) throw new Error("Karim apparaît encore connecté");
  });

  await step("Gérant : mauvais nom refusé, bon nom supprime tout", async () => {
    await g.goto(B + "/parametres");
    await g.getByRole("button", { name: "Supprimer mon compte et mon entreprise" }).click();
    const go = g.getByRole("button", { name: "Tout supprimer" });
    await g.fill("#del-name", "Autre nom");
    if (await go.isEnabled()) throw new Error("bouton actif avec un mauvais nom");
    await g.fill("#del-name", E2E_COMPANY.toUpperCase());
    await go.click();
    await g.waitForURL((u) => new URL(u).pathname === "/", { timeout: 30000 });
  });

  await step("Le compte n'existe plus", async () => {
    await g.goto(B + "/connexion");
    await g.fill("#email", E2E_EMAIL);
    await g.fill("#password", E2E_PASSWORD);
    await g.getByRole("button", { name: "Se connecter" }).click();
    await g.getByText("E-mail ou mot de passe incorrect.").waitFor({ timeout: 15000 });
  });
  if (errors.length) throw new Error("Erreurs de page : " + errors.join(" | "));
  console.log("Suppression de compte : tout est passé.");
} finally {
  await b.close();
}
