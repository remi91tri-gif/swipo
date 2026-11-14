// Lot 4 : imprévu → décision du gérant → réponse chez l'agent ; reprise ; validation groupée.
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
  const a = await page({ width: 390, height: 844 });
  const jobs = {};

  current = g;
  await step("Gérant : connexion, Karim dans l'équipe", async () => {
    await login(g, env("E2E_EMAIL"), env("E2E_PASSWORD"), "**/aujourdhui");
    await g.goto(B + "/equipe");
    await g.fill("#first_name", "Karim");
    await g.fill("#phone", "06 11 22 33 44");
    await g.getByRole("button", { name: "Ajouter", exact: true }).click();
    await g.getByText("Karim est ajouté").waitFor({ timeout: 15000 });
  });
  for (const [key, time] of [["vitrine", "09:00"], ["villa", "14:00"]]) {
    await step(`Gérant : chantier ${key} à ${time} sans preuves exigées`, async () => {
      await g.goto(B + "/chantiers/nouveau");
      if (key === "vitrine") {
        await g.selectOption("#client_id", "new");
        await g.fill("#new_client_name", "Boulangerie du Port");
        await g.fill("#new_address", "4 quai Lunel, 06300 Nice");
      }
      await g.fill("#time", time);
      await g.getByText("Karim", { exact: false }).last().click();
      await g.getByText("Photos avant et après").click();
      await g.getByText("Checklist", { exact: true }).click();
      await g.getByRole("button", { name: "Créer le chantier" }).click();
      await g.waitForURL(/cree=1/, { timeout: 20000 });
      jobs[key] = g.url().split("/chantiers/")[1].split("?")[0];
    });
  }

  current = a;
  await step("Agent : termine la vitrine, signale un blocage à la villa", async () => {
    await login(a, env("E2E_AGENT_EMAIL"), env("E2E_AGENT_PASSWORD"), "**/agent");
    await a.goto(`${B}/agent/mission/${jobs.vitrine}`);
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
    await a.goto(`${B}/agent/mission/${jobs.villa}`);
    await a.getByRole("button", { name: "Démarrer" }).click();
    await a.getByRole("link", { name: "Signaler un problème" }).click();
    await a.fill("#detail", "Portail fermé, personne ne répond.");
    await a.getByRole("button", { name: "Envoyer à mon gérant" }).click();
    await a.getByRole("heading", { name: "Envoyé" }).waitFor({ timeout: 15000 });
  });

  current = g;
  await step("Gérant : décide « Continuer » avec un message", async () => {
    await g.goto(`${B}/chantiers/${jobs.villa}`);
    await g.getByText("IMPRÉVU BLOQUANT").first().waitFor({ timeout: 15000 });
    await g.fill("#decision-message", "J'ai appelé le client, il arrive.");
    await g.getByRole("button", { name: /^Continuer/ }).click();
    await g.getByText("Décision :").waitFor({ timeout: 15000 });
    await g.getByText("En cours").first().waitFor();
  });

  current = a;
  await step("Agent : voit la réponse et termine la villa", async () => {
    await a.goto(`${B}/agent/mission/${jobs.villa}`);
    await a.getByText("Réponse de votre gérant : Continuez le chantier.").waitFor({ timeout: 15000 });
    await a.getByText("« J'ai appelé le client, il arrive. »").waitFor();
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
  });

  current = g;
  await step("Gérant : demande une reprise sur la vitrine", async () => {
    await g.goto(`${B}/chantiers/${jobs.vitrine}`);
    await g.getByRole("button", { name: "Demander une reprise" }).click();
    await g.fill("#motif", "Traces sur la vitrine côté quai.");
    await g.getByRole("button", { name: /^Envoyer à/ }).click();
    await g.getByText("Reprise demandée").first().waitFor({ timeout: 15000 });
    await g.getByText("À reprendre").first().waitFor();
  });

  current = a;
  await step("Agent : voit le motif, refait et termine la reprise", async () => {
    await a.goto(`${B}/agent/mission/${jobs.vitrine}`);
    await a.getByText("« Traces sur la vitrine côté quai. »").waitFor({ timeout: 15000 });
    await a.getByRole("button", { name: "Démarrer la reprise" }).click();
    await a.getByRole("button", { name: "Terminer" }).click();
    await a.getByRole("heading", { name: "C'est net." }).waitFor({ timeout: 15000 });
  });

  current = g;
  await step("Gérant : « Tout valider (2) » dans À vérifier", async () => {
    await g.goto(`${B}/chantiers?vue=a-verifier`);
    await g.getByRole("button", { name: "Tout valider (2)" }).click();
    await g.getByText("Rien à vérifier").waitFor({ timeout: 15000 });
    await g.goto(`${B}/chantiers/${jobs.villa}`);
    await g.getByText("Validé").first().waitFor();
  });
} finally {
  console.log(errors.length ? "erreurs navigateur :\n" + errors.join("\n") : "aucune erreur navigateur");
  await b.close();
}
