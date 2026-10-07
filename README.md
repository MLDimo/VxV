# VXV

Outil de guilde WoW Forever : addon, site, bot Discord et app compagnon, autour d'une base Supabase.

- Conventions et fonctionnalités : [CLAUDE.md](CLAUDE.md).
- Tests encore à faire en jeu : [docs/tests-en-jeu.md](docs/tests-en-jeu.md).
- Résultats de la sonde sur WoW Forever : [docs/phase-0/resultats.md](docs/phase-0/resultats.md).
- Charte graphique « La Taverne », maquettes et captures : [docs/design](docs/design/VXV_Design_Spec.md).

## Démarrer

```sh
nvm use          # Node 22 ou plus
npm i -g npm@11  # npm 11 ou plus (npm 10 plante sur la résolution des dépendances de Vitest 4)
npm install      # installe tous les espaces de travail
npx playwright install chromium   # navigateur des tests de bout en bout, une fois
npm run check    # formatage, lint, typage, tests unitaires et de bout en bout ; aussi lancé avant chaque push
npm run generate # packs de l'addon et SQL des raids, depuis data/raids
npm run dev -w @vxv/web   # site en local sur http://localhost:3000
VXV_SITE_URL=http://localhost:3000 npm start -w @vxv/companion   # compagnon relié au site local
npm run package -w @vxv/companion   # installeur du compagnon pour la plateforme, dans apps/companion/release
```

Depuis le terminal de VS Code, lancer Electron avec `env -u ELECTRON_RUN_AS_NODE …` : sinon il se comporte comme Node.

## Structure

Dépôt unique géré par les espaces de travail npm. Un dossier n'est créé que quand il a du contenu.

| Dossier | Contenu |
| --- | --- |
| `apps/web` | Site et API, Next.js 16 sur Vercel ([vxv-web.vercel.app](https://vxv-web.vercel.app)), et adresse des interactions du bot (`/api/discord/interactions`) |
| `apps/companion` | Compagnon de bureau (Electron, Windows et Mac) : relie le jeu au site (`@vxv/companion`) |
| `packages/server` | Cœur du serveur partagé par le site et le bot : domaine, cas d'usage, PostgreSQL (`@vxv/server`) |
| `packages/bot` | Bot Discord en interactions HTTP : signature, commandes, boutons (`@vxv/bot`), hébergé par `apps/web` |
| `packages/raid-data` | Schéma et validation des données de raid (`@vxv/raid-data`) |
| `packages/lua` | Données Lua 5.1 : écriture pour l'addon, lecture des SavedVariables du jeu sans les exécuter (`@vxv/lua`) |
| `packages/design` | Jetons de la charte (couleurs, polices), thème du site et de l'addon générés (`@vxv/design`) |
| `addon/` | Bundles Lua de l'addon (`VXV_Core`, `VXV_Raid`, `VXV_Sync`, `VXV_Paris`…) |
| `data/raids` | Source des données de raid en JSON, une par raid ([format](data/raids/README.md)) |
| `supabase/` | Schéma, migrations et tests de la base (`@vxv/database`) |
| `tools/data-generator` | Packs de l'addon et script SQL des raids dans `dist/generated` (`npm run generate`) |
| `tools/addon-release` | Rassemble les dossiers de l'addon et inscrit la version (`npm run release:prepare -- v1.2.0`) |
| `tools/addon-harness` | Banc d'essai des addons hors du jeu, sur un client simulé, et export du journal de la sonde (`npm run export:probe -- <fichier>`) |
| `tools/VXV_Probe` | Sonde : addon de mesure sur WoW Forever, jamais distribué |
| `tools/install-addon.sh` | Construit l'addon comme une publication (version de développement) et l'installe dans un client |
| `tools/install-probe.sh` | Copie la sonde dans le dossier AddOns d'un client |
| `tools/deploy-database.sh` | Déploie la base : migrations puis données de raid |
| `docs/` | Charte graphique, résultats de la sonde, tests à faire en jeu |

## Environnements

| | Test | Production |
| --- | --- | --- |
| Base | Supabase `vxv-test` | Supabase `vxv-prod` |
| Mise à jour de la base | Automatique à chaque fusion dans `main` qui touche `supabase/migrations` ou `data/raids` | Manuelle : `gh workflow run deploy-database.yml --ref main -f target=production` |
| Site et bot (Vercel, projet `vxv-web`) | Prévisualisation de chaque demande de fusion, la dernière sur https://vxv-web-test.vercel.app (protégée par Vercel) | `main`, sur https://vxv-web.vercel.app |

Tout part de la CI, après les tests : le déploiement automatique de Vercel depuis git est désactivé (`apps/web/vercel.json`).
La CI rejoue aussi le déploiement de la base deux fois sur un PostgreSQL jetable à chaque demande de fusion. La base de
test ne contient jamais de vraies données de membres : son mot de passe est considéré comme exposé.

## Secrets et variables

Aucun secret dans le dépôt (`.env` et ses variantes sont ignorés par git). Un secret se saisit sans l'afficher :
`gh secret set <NOM>` pour GitHub, `vercel env add <NOM> <environnement>` pour Vercel.

| Où | Secrets | Variables |
| --- | --- | --- |
| GitHub, flux « Deploy database » | `SUPABASE_TEST_DB_URL`, `SUPABASE_PRODUCTION_DB_URL` (« Session pooler » : GitHub ne joint pas l'IPv6 de la connexion directe) | |
| GitHub, flux « CI » | `VERCEL_TOKEN` (équipe « MLDimo's projects »), `DISCORD_BOT_TOKEN` | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` |
| GitHub, flux « Release addon » | `CF_API_KEY`, `WAGO_API_TOKEN` | `CF_PROJECT_ID`, `CF_GAME_VERSION_IDS`, `WAGO_PROJECT_ID`, `WAGO_PATCH_FIELD`, `WAGO_PATCH` |
| GitHub, flux « Release companion » | `COMPANION_RELEASES_TOKEN` | |
| Vercel, Preview et Production | Liste et rôle de chacune dans `apps/web/.env.example` ; `DATABASE_URL` en « Transaction pooler » (port 6543) | |

La clé « service role » de Supabase ne quitte jamais le serveur. Après un changement de mot de passe d'une base, remplacer
son secret et attendre quelques minutes avant de déployer : le « Session pooler » met un peu de temps à l'accepter.

## Discord

- Application « VXV » : adresses de redirection `/connexion/discord/retour` du site de production, de test et de
  `http://localhost:3000` ; « Interactions Endpoint URL » sur `https://vxv-web.vercel.app/api/discord/interactions`.
  Bot privé, sans intent privilégié ; après chaque déploiement en production, la CI enregistre ses commandes.
- Serveur : le rôle du bot au-dessus des rôles des membres et des rôles de titre « ◆ … » (il ne modifie que ce qui est
  en dessous de lui ; personne ne renomme le propriétaire). Tout membre du serveur est membre de la guilde ; le GM
  porte un rôle « GM ».
- Tâches planifiées de Vercel (`apps/web/vercel.json`), protégées par `CRON_SECRET` : récap des raids à 7 h UTC,
  rappels des raids à 8 h UTC, titres de la semaine le mercredi à 5 h UTC.

## Publier l'addon

Une étiquette `v<version>` sur `main` lance la publication, après les tests :

```sh
git tag v0.1.0 && git push origin v0.1.0
```

La CI génère les packs, crée l'archive `VXV-<version>.zip`, puis la publie sur GitHub. Une version avec un tiret, comme
`v0.2.0-beta.1`, est publiée en bêta. Un lancement manuel du flux « Release addon » construit l'archive sans rien
publier. L'envoi sur CurseForge et Wago s'active dès que leurs secrets et variables sont renseignés.

## Publier le compagnon

Une étiquette `compagnon-v<version>` sur `main` construit les installeurs Windows et Mac (universel Intel et puces
Apple, signature ad hoc) et les publie dans le dépôt public [MLDimo/vxv-compagnon](https://github.com/MLDimo/vxv-compagnon)
sous l'étiquette `v<version>`, d'où les compagnons installés se mettent à jour (automatiquement sous Windows, annoncée
sur Mac). Une version avec un tiret est publiée en préversion, que les compagnons installés ignorent.

```sh
git tag compagnon-v1.5.0 && git push origin compagnon-v1.5.0
```

`COMPANION_RELEASES_TOKEN` : jeton GitHub à portée fine, limité à `MLDimo/vxv-compagnon`, permission « Contents : Read
and write ». Sans lui, le flux construit les installeurs sans publier.
