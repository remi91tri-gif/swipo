// Équipe : modifier une personne déjà ajoutée (prénom, nom, portable, rôle).
// Usage : E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/equipe.mjs (gérant à sa première connexion).
const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
const { chromium } = pw.default ?? pw;
const B = process.env.E2E_URL ?? "http://localhost:3000";
const b = await chromium.launch();
const errors = [];
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
p.on("pageerror", (e) => errors.push(e.message));
async function step(name, fn) {
  try {
    await fn();
    console.log("ok  " + name);
  } catch (e) {
    console.log("ÉCHEC " + name + " : " + e.message.split("\n")[0]);
    await p.screenshot({ path: "e2e-echec.png", fullPage: true });
    throw e;
  }
}
async function add(first, phone) {
  await p.fill("#first_name", first);
  await p.fill("#phone", phone);
  await p.getByRole("button", { name: "Ajouter", exact: true }).click();
  await p.getByText(`${first} est ajouté`).waitFor({ timeout: 15000 });
}

try {
  await step("Gérant : ajoute Karim et Inès", async () => {
    await p.goto(B + "/connexion");
    await p.fill("#email", process.env.E2E_EMAIL);
    await p.fill("#password", process.env.E2E_PASSWORD);
    await p.getByRole("button", { name: "Se connecter" }).click();
    await p.waitForURL("**/aujourdhui", { timeout: 20000 });
    await p.goto(B + "/equipe");
    await add("Karim", "06 11 22 33 44");
    await add("Inès", "06 55 66 77 88");
  });
  await step("Modifie Karim : nom, portable, rôle chef d'équipe", async () => {
    await p.getByRole("button", { name: "Modifier Karim" }).click();
    const f = p.getByRole("form", { name: "Modifier Karim" });
    await f.getByLabel("Nom", { exact: true }).fill("Benali");
    await f.getByLabel("Portable").fill("07 12 34 56 78");
    await f.getByLabel("Rôle").selectOption("chef");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await p.getByText("Karim Benali").waitFor({ timeout: 15000 });
    await p.getByText("Chef d'équipe · 07 12 34 56 78").waitFor();
  });
  await step("Gardé après rechargement", async () => {
    await p.reload();
    await p.getByText("Karim Benali").waitFor({ timeout: 15000 });
    await p.getByText("Chef d'équipe · 07 12 34 56 78").waitFor();
  });
  await step("Numéro déjà pris : message clair", async () => {
    await p.getByRole("button", { name: "Modifier Inès" }).click();
    const f = p.getByRole("form", { name: "Modifier Inès" });
    await f.getByLabel("Portable").fill("07 12 34 56 78");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await p.getByText("Ce numéro est déjà utilisé par une autre personne de l'équipe.").waitFor({ timeout: 15000 });
    await f.getByRole("button", { name: "Annuler" }).click();
  });
  await step("Le gérant modifie son propre nom, pas son rôle", async () => {
    await p.getByRole("button", { name: "Modifier Marc" }).click();
    const f = p.getByRole("form", { name: "Modifier Marc" });
    if (!(await f.getByLabel("Rôle").isDisabled())) throw new Error("rôle modifiable");
    await f.getByLabel("Portable").fill("06 99 88 77 66");
    await f.getByLabel("Nom", { exact: true }).fill("Testeur");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await p.getByText("Marc Testeur").first().waitFor({ timeout: 15000 });
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
