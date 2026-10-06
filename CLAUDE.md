# VXV

Outil de guilde pour WoW Forever : addon en jeu, site web, bot Discord et app compagnon, autour d'une base Supabase.
Gestion des raids, soft reserves (SR), attribution et suivi du loot, puis paris, missions, titres, artisans et deathroll.
Le plan de référence est le PDF « VXV - Plan de développement » v1.0 du 3 octobre 2026 : 16 phases (P0 à P15),
avancées étape par étape, complété par `docs/plan/decisions-2026-10-03.md` (SR+, historique, droits, modèle de données)
et `docs/plan/decisions-2026-10-06.md` (règles de calcul des paris).

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
- **P4 Addon : VXV_Core** : terminée (`addon/VXV_Core`, 55 tests du banc `tools/addon-harness`), validée en jeu à deux joueurs le 4 octobre :
  - 4.1 socle (modules, bus, stockage versionné) et 4.2 Compat sur les API mesurées en P0 et pendant la validation ;
  - 4.3 interface : fenêtre à onglets, `/vxv`, icône de minimap déplaçable ;
  - 4.6 communication : morceaux de 255 octets, file 10 + 1/s et pause pendant les boss, versions, présence, `/vxv ping` ;
  - 4.7 filtre de guilde (`Core/Config.lua` : VXV sur Forever, THE DALIRANAS sur la bêta) et export `/vxv liste`, importé sur le site.
  Relais entre joueurs fait en P7 (changements faits en jeu, relayés par un officier) ; compression inutile (données de quelques Ko). Installation : `tools/install-addon.sh`.
- **P5 Addon : onglet Raid** : code terminé (bundle `addon/VXV_Raid`, 79 tests du banc ; export du site sur la page de l'événement) :
  - le site produit les données de l'événement (`VXV-RAID-2` depuis la P7, officiers seulement), qu'un officier colle en jeu (`/vxv importer`) ;
  - onglet Raid : inscrits (icône de rôle, couleur et classe au survol), mes SR, SR du raid avec SR+, objets exclus, modifications avec motif ;
  - diffusion à la guilde, relais vers qui se connecte plus tard, avertissement des modifications, rappel aux officiers quand leurs données datent d'avant le verrouillage des SR ;
  - invitations : ouverture par un officier, Rejoindre (invitation automatique des inscrits attendus avec leur personnage principal, demandes pour les autres), Inviter tout le roster, passage en raid à la première acceptation.
  Validation en attente : essai en jeu à deux joueurs au moins avant la fin de la bêta, puis un raid de 40 formé sans invitation manuelle.
- **P6 Assistant d'attribution + historique** : code terminé (bundle `addon/VXV_Raid`, 100 tests du banc ; import du journal et corrections sur le site) :
  - butin du boss montré à tout le raid avec ses SR, quand le maître du butin ouvre le corps ;
  - attribution selon les règles du plan (une SR : sans roll ; plusieurs : roll entre elles avec SR+ ; aucune : roll libre ; objet exclu : loot council), message pour chacun, rolls suivis en direct, annonces dans le canal du groupe, don d'un clic ;
  - journal du raid en jeu (boss, présents, morts, objets, diffusé par le maître du butin), montré dans le Journal, export `VXV-LOG-1` (zone officier de l'écran Raid ou `/vxv journal`) ;
  - import du journal sur le site (présents et objets, qui nourrissent le SR+), corrections par un officier avec motif, récap de fin de raid publié par le bot.
  Validation en attente : un raid réel enregistré sans saisie manuelle (raids ouverts le 9 décembre ; répétition en donjon avec maître du butin possible avant la fin de la bêta).
- **Habillage (charte « La Taverne »)** : terminé avant la P7 (`docs/plan/decisions-2026-10-05.md`), validé en jeu le 5 octobre sauf le mode réduit :
  - socle : référence `docs/design/`, jetons `packages/design` (thème du site et `VXV_Core/UI/Tokens.lua` générés) ;
  - site entièrement rhabillé, en production ;
  - mesure en jeu des polices et textures faite (`docs/design/mesure-en-jeu-2026-10-05.md`) ;
  - addon : thème (polices en familles, anneaux, boutons, onglets), fenêtre 1000×680 à un onglet par lieu, Taverne vivante (lueurs, parallaxe, plaques qui montent au survol) et cartes du moment, fond de chaque écran cadré sur son lieu ;
  - addon : écran Raid en trois colonnes, Journal en livre de comptes, panneau de butin et copier-coller en boîtes de dialogue de la charte, listes à la molette ;
  - addon : mode réduit 420×600 (bouton de l'en-tête, `/vxv` rouvre le dernier mode) ; son onglet Raid montre le prochain boss de l'instance (packs de données), son butin avec les SR et une alerte quand le joueur y a une SR ;
  - laissés pour plus tard : badges sur les plaques (« ! », nombre d'éléments en attente), avatars (P7 : race et sexe transmis par l'addon), filtres du Journal.
  Validation en attente : le mode réduit en jeu, dans « La salle des Thanes » (seul pack de la bêta).
- **P7 App compagnon** : code terminé (`apps/companion`, guide `docs/compagnon.md`) :
  - 7.1 et 7.2 : application Electron (Windows et Mac) dans la charte, icône près de l'horloge, démarrage avec l'ordinateur, détection des versions du jeu où l'addon est installé, liaison au compte en un clic (navigateur, PKCE, jeton haché côté site, rôles relus sur Discord chaque heure) ; installeurs non signés (signature ad hoc sur Mac), mises à jour depuis le dépôt public `MLDimo/vxv-compagnon` (automatiques sous Windows, annoncées sur Mac), page « Compagnon » du site ;
  - 7.3 descente : bundle `VXV_Sync`, prochain événement écrit toutes les 5 minutes, lu au `/reload` ; un officier le transmet à la guilde ;
  - 7.4 remontée : boîte d'envoi `VXV_SyncDB` (liste de guilde, journaux de raid, race et sexe des personnages), lue sans exécution (`@vxv/lua`) après chaque `/reload` ou déconnexion ; récap Discord publié le lendemain (tâche de 7 h UTC) ;
  - 7.5 modifications en jeu : inscription, SR et exclusions depuis l'écran Raid, en attente puis confirmées ou refusées (lignes `C` de `VXV-RAID-2`), relayées par un officier équipé pour les membres sans compagnon ;
  - 7.6 robustesse : droits vérifiés par le site, dédoublonnage (journaux, liste plus ancienne ou incomplète, changements par identifiant).
  En attente : le jeton `COMPANION_RELEASES_TOKEN` (voir le guide) pour publier la première version, puis un essai réel (liaison, `/reload`, envoi) avant la fin de la bêta.
- **P8 Prochain boss** : code terminé (bundle `VXV_Raid`) :
  - 8.1 prochain boss : dans l'instance d'un raid, son premier boss pas encore tué à l'événement (ordre du pack) ; ailleurs, le premier boss debout des raids de l'événement, dans leur ordre ; un joueur qui rejoint le raid en retard apprend du maître du butin (ou du chef) les boss déjà tués ;
  - 8.2 panneau : en tête de « SR du raid » sur l'écran Raid (son butin et qui l'a réservé), et dans le mode réduit ;
  - 8.3 alerte : message au milieu de l'écran et son de l'avertissement de raid, une fois par boss où le joueur a une SR ; désactivable (`/vxv alerte` ou le bouton « Alerte » de l'écran Raid).
  La position est relue toutes les 5 s (`PLAYER_ENTERING_WORLD` et `ZONE_CHANGED_NEW_AREA` sont acceptés depuis la mesure du 6 octobre, mais pas encore vus se déclencher) ; le son passe par Compat (`PlaySound` mesuré le 6 octobre).
  Validation en attente : l'alerte sur un raid enchaînant deux instances (raids ouverts le 9 décembre ; en bêta, « La salle des Thanes » seule).
- **P9 Inscriptions bidirectionnelles** : code terminé :
  - 9.1 inscription en jeu et 9.3 message Discord à jour : faits en P7.5 (changement en attente puis confirmé, le site met à jour le message de l'événement) ;
  - 9.2 création d'événement en jeu (officiers) : bouton « Créer un événement » de l'écran Raid (date et heure comme `/vxv_raid`, raids des packs, SR par joueur, motif), créé par le site avec la même lecture des dates (`domain/raidStart.ts`, partagée avec le bot), journalisé et annoncé sur Discord ; la réponse revient avec les données de tout événement pendant 14 jours ;
  - 9.4 conflits : le site fait foi et la modification la plus récente gagne avant le verrouillage (heure de l'inscription et de ses SR en base ; un changement fait en jeu porte l'heure du jeu, ramenée à l'heure du site si elle la dépasse).
  Validation en attente : une inscription faite en jeu apparaît sur Discord après la synchro (compagnon relié).
- P10 Mise en production : pas commencée (le propriétaire a lancé la P11 et la P12 avant).
- **P11 Paris** : code terminé.
  - 11.1 à 11.4 : paris, choix et mises en base ; ouverture par un officier (site, `/vxv_pari`), mises depuis le
    site et Discord (boutons « Miser » et « Retirer ma mise »), cotes en direct dans le message du pari
    (`packages/server/src/domain/bets.ts`, section « Le Dé Pipé » du site, `/paris`) ;
  - 11.5, 11.6 et 11.9 : résultat ou annulation par un officier (gains, message Discord, journal), trésorerie
    (mises reçues, dettes qui bloquent les paris, gains versés, historique, `/paris/tresorerie`, rôle trésorier
    seul), caisse de la guilde en ajout seul sur la page gauche du Journal (part des paris, dons, dépenses) ;
  - 11.7 : classement des parieurs (Ranking, `/ranking` : podium à fanions, avatars, périodes) et saisons lancées
    par un officier.
  - 11.8 : bundle `VXV_Paris` (Le Dé Pipé en jeu : paris ouverts et cotes, mises en attente puis confirmées, mes
    paris, classement, caisse, carte de la Taverne, onglet « Paris » du mode réduit ; caisse aussi sur la page gauche
    du Journal). Données `VXV-PARIS-1` apportées par le compagnon et relayées par les officiers ; le partage des
    données et les changements faits en jeu sont passés dans le socle (`VXV.ShareData`, `VXV.PendingChanges`).
  Validation en attente : un pari réel mené jusqu'au versement des gains ; publier le compagnon 1.1 (données des
  paris).
- P12 à P15 : pas commencées.

## Design (charte « La Taverne »)

- Référence : `docs/design/VXV_Design_Spec.md`, captures et maquettes ; décisions : `docs/plan/decisions-2026-10-05.md`.
- Jetons dans `packages/design/src/tokens.ts`, seule source des couleurs et des polices. `npm run generate` écrit `tokens.css` (thème Tailwind du site) ; un test vérifie que le fichier généré est à jour.
- Pixel art : aucun arrondi (retirés du thème), reliefs en anneaux d'ombres pleines, survol prune et or, zones officier à liseré or.
- Pixelify Sans pour les titres, onglets, plaques, boutons et gros chiffres ; Manrope pour le texte. Polices et images servies par le site (`apps/web/public`), licences OFL à côté des polices.
- Un lieu = un onglet, même nom partout : Taverne, Raid, Le Dé Pipé, Quêtes, Ranking, Artisans, Journal.
- Noms de joueurs toujours dans leur couleur de classe (`CLASS_COLORS`), et ces couleurs ne servent à rien d'autre.
- Addon : `VXV.Theme` (couleurs, polices, panneaux, boutons, anneaux) et `VXV.CreateDialog` ; aucun modèle de cadre ou de bouton du jeu (`UIPanelButtonTemplate`…), sauf la zone de saisie défilante de la fenêtre de copier-coller.
- Un module branche un lieu par `tab = { place, Build(content), Card(), Compact(content) }` : écran de la grande fenêtre, carte sous la Taverne (rafraîchie par l'événement `tavern.changed`), écran du mode réduit.
- Dégradés et lueurs en petites images PNG (`VXV_Core/Media`) : `CreateColor`, nécessaire aux dégradés du jeu, n'est pas mesuré sur Forever.
- Un cadre posé sur un autre (page sur une couverture, carte sur un panneau) en est l'enfant : le jeu dessine les textures des cadres de même niveau calque par calque, et le fond du dessous recouvrirait celui du dessus (vu sur le Journal le 5 octobre).

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
- Flux GitHub : `tests.yml` (réutilisable, seul endroit où sont définis les tests) ; `ci.yml` (demandes de fusion et `main` : tests puis déploiement du site) ; `deploy-database.yml` ; `release-addon.yml` ; `release-companion.yml` (étiquettes `compagnon-v<semver>`, installeurs publiés dans `MLDimo/vxv-compagnon`). Tout déploiement dépend de `tests.yml`.
- Versions de l'addon : étiquettes `v<semver>` sur `main`. Aucune étiquette avant que l'addon soit utilisable (P4 au plus tôt).

## Conventions Lua (addons)

- Lua 5.1, `## Interface: 16001` (WoW Forever, API Mainline 12.x avec restrictions Midnight).
- Code, noms et commentaires en anglais. Textes affichés aux joueurs en français.
- Espace de noms privé `local ADDON_NAME, ns = ...`. Aucune globale hors SavedVariables, slash commands et fichiers `External/`.
- Export de la liste de guilde (contrat avec le site, P2.4) : première ligne `VXV-ROSTER-1`, puis une ligne `Prénom;Nom;CLASSE` par personnage (classe = jeton du jeu, ex. `ROGUE`). Tout changement de format incrémente le numéro de version.
- Données d'un événement (contrat du site vers l'addon, P5) : première ligne `VXV-RAID-2`, puis une ligne par enregistrement (événement avec ses raids, officiers, objets, inscrits, journal, réponses aux changements faits en jeu), décrites dans `packages/server/src/domain/addonExport.ts`. Même règle de version.
- Compagnon (P7) : il écrit `VXV_Sync/External/Inbox.lua` (`ns.Inbox`, sans globale, format numéroté) et lit `VXV_SyncDB` sans l'exécuter ; contrats décrits dans `addon/VXV_Sync/Companion.lua` et `Outbox.lua`. Les autres bundles passent par le bus du socle : `sync.inbox` (données apportées), `sync.put` (kind, clé, valeur à envoyer), `modules.started` (tous les modules démarrés).
- Paris (contrat du site vers l'addon, P11.8) : première ligne `VXV-PARIS-1`, puis une ligne par enregistrement
  (export, officiers, personnages des membres, paris et leurs choix, mises, caisse, classement, réponses aux mises
  faites en jeu), écrites par `packages/server/src/domain/addonBets.ts` et lues par `addon/VXV_Paris/BetsData.lua`.
  Même règle de version.
- Journal d'un raid (contrat de l'addon vers le site, P6) : première ligne `VXV-LOG-1`, puis une ligne par enregistrement (raid, boss tués, présents, objets donnés, morts), lues par `packages/server/src/domain/raidLog.ts` et écrites par `addon/VXV_Raid/RaidLog.lua`. Même règle de version.
- Packs de données `VXV_Data_<Raid>` : générés par `npm run generate` (jamais modifiés à la main) dans `dist/generated/addon`. Chacun enregistre son raid dans la globale partagée `VXV_RaidData[raidId]`, seul point de contact avec `VXV_Core`. Ils dépendent de `VXV_Core` et se chargent avec le jeu (quelques Ko chacun ; le chargement à la demande, `C_AddOns.LoadAddOn`, n'est pas mesuré sur Forever) ; `VXV_Raid` y trouve le raid de l'instance où se trouve le joueur.
- `VXV_Core` expose une seule globale, `VXV` : l'API publique des bundles (modules, bus interne, messages entre addons, événements du jeu, fenêtres, infobulle), décrite dans `addon/VXV_Core/Api.lua`. Les bundles ne voient rien d'autre du socle, et n'y ajoutent que ce qu'ils utilisent.
- Confiance entre addons : les données d'un événement ne sont gardées que si leur expéditeur figure parmi les officiers nommés par le site, dans les nouvelles données comme dans celles déjà gardées.
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
- Compagnon (`apps/companion`) : mêmes couches que le serveur (`domain`, `application` avec ses ports, `infrastructure`), plus `main` (Electron) et `renderer` (fenêtre). esbuild regroupe tout dans `dist`, l'application n'embarque aucun `node_modules` ; Electron est épinglé à une version exacte (electron-builder l'exige). Fenêtre isolée : `contextIsolation`, `sandbox`, CSP stricte, actions nommées vérifiées par le processus principal.
- Tests de bout en bout avec Playwright (`apps/web/e2e/*.spec.ts`) : le site construit (`next start`) sur une base PGlite migrée et préparée par les vrais cas d'usage. Chaque parcours visible par un joueur ou un officier y a au moins un test.

## Base de données (Supabase)

- Migrations SQL dans `supabase/migrations`, nommées `AAAAMMJJHHMMSS_sujet.sql`, jamais modifiées une fois fusionnées : toute évolution passe par une nouvelle migration.
- Toutes les tables activent la sécurité par ligne sans politique : seul le serveur (rôle service) lit et écrit.
- Le journal (`journal`) est en ajout seul, motif obligatoire, garanti par des triggers.
- Déploiement : `tools/deploy-database.sh` (migrations puis données de raid), automatique vers test, manuel vers production. Voir `docs/environnements.md`.
- Une migration lue par le code fusionné se déploie en production aussitôt la fusion faite (`deploy-database.yml`, cible production) : le site part en production automatiquement, la base non.
- Les règles d'intégrité vivent dans le schéma (contraintes) et sont couvertes par des tests PGlite (`supabase/tests`). `@vxv/database/testing` fournit une base migrée pour les tests des autres paquets.

## Contraintes WoW Forever (mesurées en P0, build 70170 ; inventaire refait sur le build 70235 le 6 octobre)

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
- Build 70235 (6 octobre, `docs/phase-0/sessions/2026-10-06.txt`) : `PlaySound` et `SOUNDKIT` présents ; événements `PLAYER_ENTERING_WORLD` et `ZONE_CHANGED_NEW_AREA` acceptés ; anciennes globales absentes (`InviteUnit`, `ConvertToRaid`, `GetNumSkillLines`, `GetNumTradeSkills` : passer par `C_PartyInfo` et `C_TradeSkillUI`) ; événement `TRADE_SKILL_UPDATE` refusé (`TRADE_SKILL_LIST_UPDATE` accepté).
- Habillage (mesuré le 5 octobre, `docs/design/mesure-en-jeu-2026-10-05.md`) : textures PNG et TGA de l'addon affichées nettes en `NEAREST`, même hors puissance de deux ; polices TTF de l'addon chargées en différé (premier `SetFont` à `false`) ; chinois et coréen absents de nos polices, affichés par une famille de polices (`CreateFontFamily`) qui prend les polices du jeu pour ces alphabets ; `RAID_CLASS_COLORS`, `C_ClassColor`, `UnitRace`, `UnitSex` et `UnitClass` présents.
