# VXV

Outil de guilde pour WoW Forever : addon en jeu, site web, bot Discord et app compagnon, autour d'une base Supabase.
Gestion des raids, soft reserves (SR), attribution et suivi du loot, puis paris, missions, titres, artisans et deathroll.
Le plan de référence est le PDF « VXV - Plan de développement » v1.0 du 3 octobre 2026 : 16 phases (P0 à P15),
avancées étape par étape, complété par `docs/plan/decisions-2026-10-03.md` (SR+, historique, droits, modèle de données).

## État d'avancement

- **P0 Validation technique** : terminée, y compris la distribution par le maître du butin et les tests complémentaires T1 à T10 du 3 octobre. Sonde `tools/VXV_Probe`, protocole et rapport dans `docs/phase-0/`.
  Toute modification de la sonde passe `npm run check` avant `tools/install-probe.sh`. Le harnais vérifie aussi la longueur des lignes et les globales autorisées de `.luacheckrc`.
- **P1 Fondations** : terminée. Bases Supabase `vxv-test` et `vxv-prod` créées et déployées. CurseForge et Wago à activer quand les projets existeront.
- **P2 API et site** : terminée et validée en conditions réelles le 3 octobre (connexion Discord, liste de guilde, personnage, événement, inscription, SR, journal sur https://vxv-web.vercel.app). Inclut les décisions du 3 octobre : rôles cumulables, tout membre du serveur Discord est membre de la guilde, mode d'attribution des loots et historique complet, présence au raid et SR+ ; 25 tests de bout en bout.
- **P3 Bot Discord** : code terminé (3.1 à 3.7, 31 tests de bout en bout), en production. Le bot fonctionne en interactions HTTP, hébergé par le site (`/api/discord/interactions`, code dans `packages/bot`) :
  - `/vxv_main` et `/vxv_reroll` (salon de liaison) ;
  - pseudo « Pseudo - [Prénom Nom] » et rôle de classe ;
  - `/vxv_raid` (officiers) et message d'inscription dans le salon des raids ;
  - inscription par bouton, synchronisée avec le site dans les deux sens ;
  - rappel quotidien (tâche Vercel, 8 h UTC).
  Validation en attente : essai réel sur le serveur avec un second compte.
- **P4 Addon : VXV_Core** : en cours. 4.1 socle (bundle `addon/VXV_Core`, modules, bus, stockage versionné, banc d'essai `tools/addon-harness`), 4.2 couche Compat (API mesurées en P0 ; `GetGuildInfo`, `UnitClass` et `GetCursorPosition` à confirmer en jeu), 4.3 interface (fenêtre à onglets, `/vxv`, icône de minimap), 4.6 communication (sérialisation, morceaux de 255 octets, file 10 + 1/s et pause pendant les boss, versions, présence, `/vxv ping`). Compression et relais entre joueurs reportés à la synchro de la P7, leur premier usage. Essai en jeu : `tools/install-addon.sh`.
- P5 à P15 : pas commencées.

## Structure du dépôt

Dépôt unique, espaces de travail npm (`apps/*`, `packages/*`, outils), Node 22 ou plus, npm 11 ou plus (npm 10.9 plante sur les dépendances optionnelles de Vitest 4). `npm audit` doit rester à zéro vulnérabilité.
La table complète est dans le README. Règles :

- Un dossier n'est créé qu'à la phase qui le remplit (YAGNI).
- `apps/` contient les applications déployées, `packages/` le code TypeScript partagé, `addon/` les bundles Lua.
- Paquets nommés `@vxv/<nom>`. Une application ne dépend jamais d'une autre application, seulement de `packages/`.

## Principes non négociables

- **DRY, SOLID, KISS, YAGNI** sur tout le code, sans exception.
- **Clean architecture** : le domaine ne dépend de rien ; l'infrastructure (Blizzard, Supabase, Discord) est derrière des adaptateurs.
- **Bundles indépendants** : chaque fonctionnalité est un bundle (`VXV_Core`, `VXV_Raid`, `VXV_Data_<Raid>`, `VXV_Sync`, `VXV_Paris`) qui ne dépend que du socle.
- La base de données fait foi. Discord, le site, le compagnon et l'addon ne sont que des points d'accès.
- Droits contrôlés par le serveur, jamais par l'addon ni le compagnon.
- Toute action d'officier passe par un journal non effaçable avec motif obligatoire.
- Nouveau raid = nouvelles données (JSON), jamais de modification de code.
- Membres : zéro effort. Installer l'addon suffit.

## Workflow git et tests

- Commits au format Conventional Commits : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
- Une branche par étape (`feat/p1-4-raid-data`), fusionnée dans `main` par pull request une fois la CI verte.
- `npm run check` lance toutes les vérifications. Le hook `pre-push` (activé par `npm install`) bloque tout push si l'une échoue. Ne jamais le contourner (`--no-verify` interdit).
- `main` n'est pas protégée côté GitHub (offre gratuite, dépôt privé) : la discipline repose sur le hook et la CI.
- À chaque push, décider explicitement si la nouveauté mérite un test unitaire, et le justifier dans la pull request.
- Flux GitHub : `tests.yml` (réutilisable, seul endroit où sont définis les tests) ; `ci.yml` (demandes de fusion et `main` : tests puis déploiement du site) ; `deploy-database.yml` ; `release-addon.yml`. Tout déploiement dépend de `tests.yml`.
- Versions de l'addon : étiquettes `v<semver>` sur `main`. Aucune étiquette avant que l'addon soit utilisable (P4 au plus tôt).

## Conventions Lua (addons)

- Lua 5.1, `## Interface: 16001` (WoW Forever, API Mainline 12.x avec restrictions Midnight).
- Code, noms et commentaires en anglais. Textes affichés aux joueurs en français.
- Espace de noms privé `local ADDON_NAME, ns = ...`. Aucune globale hors SavedVariables, slash commands et fichiers `External/`.
- Export de la liste de guilde (contrat avec le site, P2.4) : première ligne `VXV-ROSTER-1`, puis une ligne `Prénom;Nom;CLASSE` par personnage (classe = jeton du jeu, ex. `ROGUE`). Tout changement de format incrémente le numéro de version.
- Packs de données `VXV_Data_<Raid>` : générés par `npm run generate` (jamais modifiés à la main) dans `dist/generated/addon`. Chacun enregistre son raid dans la globale partagée `VXV_RaidData[raidId]`, seul point de contact avec `VXV_Core`. Ils dépendent de `VXV_Core` et se chargent à la demande.
- `VXV_Core` expose une seule globale, `VXV` : l'API publique des bundles (enregistrement des modules, bus d'événements interne). Les bundles ne voient rien d'autre du socle.
- Données sauvegardées (`VXV_DB`) : numéro de schéma, et migrations appliquées au chargement ; une migration publiée ne change plus.
- Un fichier = une responsabilité. Module exposé via `ns.<Module>` ; dépendances lues en tête de fichier (`local Util = ns.Util`).
- Nommage : `PascalCase` pour modules et fonctions publiques, `camelCase` pour locales, `UPPER_SNAKE_CASE` pour constantes. Pas de nombre magique.
- Indentation 4 espaces, 120 caractères max, lint via `.luacheckrc`.
- Tout appel à une API Blizzard dont le nom varie passe par `Compat` (contrat `ok, ...` façon `pcall`).
- Toute valeur venant du client peut être « secrète » : passer par `Util.Safe` / `Util.IsSecret` avant de comparer, concaténer ou stocker.
- SavedVariables lues uniquement dans `ADDON_LOADED` de l'addon, jamais au chargement du fichier.
- `ReloadUI()` est protégée sur Forever : demander au joueur de taper `/reload`.
- Ordre de chargement dans le `.toc` : `Core` (outillage générique) puis modules métier puis `Bootstrap.lua` en dernier.

## Zéro erreur Lua chez les joueurs (exigence, à outiller en P4)

Chaque famille d'erreur courante des addons doit être couverte par un test automatique avant toute version publiée.

| Erreur courante | Prévention | Test automatique |
| --- | --- | --- |
| API absente du client (anciennes globales, fonctions renommées) | Couche Compat uniquement | Toute globale lue par l'addon figure dans la liste des API mesurées sur Forever (inventaire de la sonde, base d'API capturée) |
| Événement inconnu ou interdit (`COMBAT_LOG_EVENT_UNFILTERED`) | Liste fermée d'événements | Chaque événement enregistré figure dans la liste validée en P0 |
| SavedVariables lues trop tôt ou absentes au premier lancement | Lecture dans `ADDON_LOADED`, valeurs par défaut, migrations versionnées | Scénarios « première installation » et « mise à jour depuis la version précédente » |
| Valeurs secrètes comparées ou concaténées | `Util.Safe` / `Util.IsSecret` | Simulateur renvoyant des noms secrets en combat |
| Action protégée en combat (cadres sécurisés, bouton minimap, `ReloadUI`) | Aucune action protégée, report après le combat | Simulateur avec `InCombatLockdown()` vrai, aucun `ADDON_ACTION_BLOCKED` |
| Bouton minimap : base de position nulle, forme de minimap inconnue, doublon avec le compartiment d'addons | Création après `ADDON_LOADED`, valeurs par défaut | Scénario sans données sauvegardées, et minimap sans `GetMinimapShape` |
| Objet pas encore en cache (`C_Item.GetItemInfo` renvoie nil) | Attente de `ITEM_DATA_LOAD_RESULT` | Simulateur renvoyant nil au premier appel |
| Globales qui fuient ou écrasent une autre addon, remplacement de fonctions Blizzard (taint) | Espace de noms privé, `hooksecurefunc` seulement | Analyse statique des globales (luacheck ou équivalent) en CI |
| Syntaxe hors Lua 5.1 | — | Analyse de syntaxe Lua 5.1 (déjà en place pour les packs) |
| Messages addon trop longs, trop rapides ou pendant un boss | File d'envoi de VXV_Core | Tests de la file : découpage 255 octets, débit, verrou de rencontre |
| Troncature d'un nom accentué au milieu d'un caractère | Découpage UTF-8 sûr | Tests sur des noms comme « Ðéjà Vu » |
| Ordre de chargement des bundles | Dépendances déclarées dans les `.toc` | Chargement des bundles dans l'ordre du client par le simulateur |

Outil : le banc d'essai `tools/addon-harness` (fengari + client simulé, tests Vitest) charge chaque addon comme le jeu, d'après son `.toc`, et porte ces scénarios.

## Architecture du serveur (`@vxv/server`)

Partagé par le site et le bot. Trois couches, vérifiées par ESLint :
- `domain/` : règles pures, aucune dépendance.
- `application/` : cas d'usage ; ne connaissent que les interfaces de `ports.ts` (dépôts, unité de travail, horloge).
- `infrastructure/` : SQL brut sur PostgreSQL (`SqlClient` : pg en production, PGlite dans les tests).
`createApplication` assemble le tout. Les composants exécutés dans le navigateur n'importent que `@vxv/server/domain/*` (pur, sans pilote PostgreSQL), jamais `@vxv/server`. Chaque cas d'usage s'exécute dans une transaction (`UnitOfWork`), journal compris. Les tests des cas d'usage tournent sur une vraie base migrée (PGlite), sans doublure.

## Conventions TypeScript (site, bot, compagnon, outils)

- TypeScript strict (`tsconfig.base.json` : `strict`, `noUncheckedIndexedAccess`), modules ES, Node 22 ou plus.
- Chaque paquet étend `tsconfig.base.json` et expose `typecheck` (`tsc --noEmit`) et `test` (`vitest run`).
- Paquets internes consommés depuis leurs sources TypeScript (`exports` vers `src/index.ts`), sans étape de build. Scripts lancés avec `tsx`.
- ESLint (`typescript-eslint` strict) et Prettier (largeur 120) sur tout le code. Markdown et Lua ne sont pas formatés par Prettier.
- `npm run check` = formatage, lint, typage, tests unitaires, tests de bout en bout. C'est la commande de la CI et du hook `pre-push`.
- Tests unitaires avec Vitest, à côté du code testé (`*.test.ts`). Les paquets qui démarrent PGlite (PostgreSQL en WebAssembly) limitent Vitest à 2 processus et portent les délais à 30 s : chaque instance coûte de la mémoire, et un poste de 8 Go sature au-delà.
- Tests de bout en bout avec Playwright (`apps/web/e2e/*.spec.ts`) : le site construit (`next start`) sur une base PGlite migrée et préparée par les vrais cas d'usage. Chaque parcours visible par un joueur ou un officier y a au moins un test.

## Base de données (Supabase)

- Migrations SQL dans `supabase/migrations`, nommées `AAAAMMJJHHMMSS_sujet.sql`, jamais modifiées une fois fusionnées : toute évolution passe par une nouvelle migration.
- Toutes les tables activent la sécurité par ligne sans politique : seul le serveur (rôle service) lit et écrit.
- Le journal (`journal`) est en ajout seul, motif obligatoire, garanti par des triggers.
- Déploiement : `tools/deploy-database.sh` (migrations puis données de raid), automatique vers test, manuel vers production. Voir `docs/environnements.md`.
- Une migration lue par le code fusionné se déploie en production aussitôt la fusion faite (`deploy-database.yml`, cible production) : le site part en production automatiquement, la base non.
- Les règles d'intégrité vivent dans le schéma (contraintes) et sont couvertes par des tests PGlite (`supabase/tests`). `@vxv/database/testing` fournit une base migrée pour les tests des autres paquets.

## Contraintes WoW Forever (mesurées en P0, build 70170)

- Client moderne : utiliser uniquement les API `C_*`. Les anciennes globales sont absentes (`SendAddonMessage`, `GetLootMethod` vérifiées).
- SavedVariables : relues correctement après `/reload` et après redémarrage sur le build 70170 (ancien bug de la bêta corrigé).
- Un fichier Lua réécrit par un programme externe est relu au `/reload` ou au lancement suivant (confirmé jusqu'à 2 Mo).
- Pas de royaume côté joueur. Un personnage = prénom + nom de famille, couple unique dans tout le jeu (clé naturelle) : `UnitName` renvoie le prénom puis le nom de famille à la place du royaume, `GetUnitName(unit, true)` renvoie « Prénom Nom ». Pas de serveur mais un type de monde (PvE, PvP, RP, HC), que `GetRealmName()` reflète (ex. « Classic Beta PvP ») : il est commun à toute la guilde, donc hors de l'identité d'un personnage.
- Noms secrets : seulement ceux des ennemis en combat. Joueurs et membres du groupe restent lisibles, même pendant un boss.
- Messages addon : 255 octets maximum (au-delà, tronqués sans erreur), 10 envois d'affilée par préfixe puis 1 par seconde, et bloqués pendant une rencontre de boss uniquement (`AddOnMessageLockdown`, verrou levé juste après ENCOUNTER_END). Expéditeur au format « Prénom Nom ». Sur GUILD, l'expéditeur ne reçoit pas ses propres messages (contrairement à PARTY).
- Boss tué = `ENCOUNTER_END` avec succès ; `BOSS_KILL` et `ENCOUNTER_LOOT_RECEIVED` ne se déclenchent pas.
- Gagnant d'un objet en butin de groupe : `C_LootHistory.GetSortedInfoForDrop` (nom, classe, GUID, jet).
- Maître du butin : interface classique présente (`MasterLooterFrame`, `GiveMasterLoot`, captable par `hooksecurefunc`). L'addon peut appeler `GiveMasterLoot`, même pendant un boss. Liste de guilde : `GetGuildRosterInfo`, pas plus d'une demande toutes les 10 s.
- Sans clic du joueur (réaction à un événement) : `C_PartyInfo.InviteUnit`, `C_PartyInfo.ConvertToRaid`, `C_ChatInfo.SendChatMessage` (hors boss) et `RandomRoll` fonctionnent.
- `/roll` : lu dans CHAT_MSG_SYSTEM avec le format du jeu `RANDOM_ROLL_RESULT`, pour tous les joueurs.
- Pendant une rencontre de boss : envoi de chat bloqué (ADDON_ACTION_BLOCKED, même depuis un clic), messages du groupe et messages système secrets (`/roll` compris). Tout redevient normal après ENCOUNTER_END.
- Compteur de dégâts du jeu (`C_DamageMeter`) : secret pendant le combat, lisible après pour tout le groupe ; nom secret pour un joueur qui a quitté le groupe.
- Morts du groupe : `UnitIsDeadOrGhost` et les noms des membres restent lisibles pendant un boss.
- Affichage : infobulles via `TooltipDataProcessor`, canal de guilde via le filtre des messages, liste de guilde moderne (`CommunitiesFrame`) via `ScrollUtil.AddInitializedFrameCallback`.
- Métiers : `GetProfessions` ; recettes connues via `C_TradeSkillUI`, quand la fenêtre du métier est ouverte.
- `COMBAT_LOG_EVENT_UNFILTERED` interdit : le client émet ADDON_ACTION_FORBIDDEN, sans erreur Lua.
