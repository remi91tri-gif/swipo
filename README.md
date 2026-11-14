# Swipo

Le suivi de chantiers des petites entreprises de nettoyage. *Un geste, tout est net.*

- **Page de présentation** : `/`
- **Espace gérant** (ordinateur) : `/aujourdhui`, `/planning`, `/chantiers`, `/clients`, `/equipe` ; compte rendu client en PDF sur `/chantiers/<id>/rapport`
- **Espace agent** (téléphone) : `/agent`, connexion par code SMS sur `/agent/connexion`

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Sans configuration Supabase, l'application tourne en **mode démonstration** :
données d'exemple, rien n'est enregistré.

## Brancher Supabase

1. Créer un projet sur supabase.com (région Europe).
2. Appliquer les migrations du dossier `supabase/migrations`, dans l'ordre.
3. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé publique (anon) du projet.
4. Pour la connexion des agents par SMS : activer le fournisseur « Phone » dans Supabase › Authentication.

## Tests de la base de données

```bash
./tests/db/run.sh
```

Lance un PostgreSQL jetable qui imite Supabase, applique les migrations et vérifie la sécurité
(une entreprise ne voit jamais les données d'une autre) et le cycle d'un chantier.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/app/(auth)` | Connexion, inscription, connexion agent par SMS |
| `src/app/(gerant)` | Espace gérant avec la barre latérale |
| `src/app/(agent)` | Espace agent |
| `src/components` | Éléments d'interface de la charte (boutons, cartes, pastilles, thème) |
| `src/lib` | Données, mode démonstration, formats, PDF du compte rendu (`report-pdf.tsx`) |
| `assets/fonts` | Polices de la charte pour le PDF (licence OFL) |
| `supabase/migrations` | Schéma, sécurité, règles métier |
| `tests/db` | Tests de la base |

## Tests des parcours (navigateur, sur une vraie base Supabase)

```bash
E2E_URL=http://localhost:3000 E2E_EMAIL=… E2E_PASSWORD=… node tests/e2e/gerant.mjs
E2E_URL=… E2E_EMAIL=… E2E_PASSWORD=… E2E_AGENT_EMAIL=… E2E_AGENT_PASSWORD=… node tests/e2e/agent.mjs
```

Lot 4 (décisions, reprises, validation groupée) : `tests/e2e/decisions.mjs`. Lot 5 (page d'accueil, compte rendu client et PDF) :
`tests/e2e/rapport.mjs`. Ensuite, `tests/e2e/nettoyage-stockage.mjs` supprime les photos et le logo du compte de test.

Si Playwright est installé ailleurs que dans le projet : `PLAYWRIGHT_PATH=/chemin/vers/playwright/index.js`.

Connexion, création de l'entreprise, équipe, client, chantiers, conflit d'agenda, planning et tableau de bord, sur une vraie base Supabase.
