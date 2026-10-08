# VXV

Outil de guilde pour WoW Forever : addon en jeu, site web, bot Discord et app compagnon, autour d'une base Supabase.
Raids et soft reserves (SR), attribution et suivi du loot, paris, missions, titres, artisans, deathroll et classements.

- Les 16 phases du plan de développement (PDF « VXV - Plan de développement » v1.0) sont codées, sauf la P10, mise en
  production.
- Tests encore à faire en jeu (mesures manquantes et validations) : `docs/tests-en-jeu.md`. Un test fait sort de la
  liste ; une mesure faite va dans les résultats de la sonde.
- Résultats de la sonde sur WoW Forever : `docs/phase-0/resultats.md`, journaux dans `docs/phase-0/sessions/`.
- Charte graphique : `docs/design/` (spécification, maquettes HTML, captures du rendu attendu).
- Environnements, secrets, Discord et publications : `README.md`.

## Fonctionnalités

- **Socle `VXV_Core`** : modules, bus, stockage versionné, Compat ; fenêtre 1000×680 à un onglet par lieu (`/vxv`,
  icône de minimap) et mode réduit 420×600 (`/vxv` rouvre le dernier mode) ; messages entre addons (morceaux de
  255 octets, file 10 + 1/s, pause pendant les boss, versions, présence, `/vxv ping`) ; filtre de guilde
  (`Core/Config.lua` : VXV sur Forever, THE DALIRANAS sur la bêta) ; export de la liste de guilde (`/vxv liste`) ;
  données du site (`VXV.SiteData`) et changements faits en jeu (`VXV.PendingChanges`), en attente puis confirmés ou
  refusés par le site, relayés par un officier équipé pour les membres sans compagnon ; rolls lus dans le chat
  (`Core/Rolls.lua`, événement `roll`) ; `VXV.SayToGuild`. Installation : `tools/install-addon.sh`.
- **Raid et SR** (`VXV_Raid`, site, bot) : un officier crée un événement (site, `/vxv_raid`, « Créer un événement » en
  jeu ; dates lues par `domain/raidStart.ts`), annoncé sur Discord ; inscriptions et SR depuis le site, le bouton du
  message Discord ou le jeu ; objets exclus par un officier ; SR verrouillées 30 minutes avant le raid ; rappel sur
  Discord. Le nombre de SR est fixé à la création. Chaque événement est réservé à un rôle Discord choisi à la création
  (`domain/eventRoles.ts`) : tout rôle du serveur sauf ceux de Discord (bots, boosters) et de VXV (classes, titres), ou
  @everyone pour tout le monde ; nom gardé tel qu'à la création, affiché partout, mentionné sans notification sur
  Discord. Seuls ses membres s'inscrivent : rôles du joueur lus sur Discord à sa première inscription (un rôle donné à
  l'instant compte ; Discord muet, inscription refusée), une inscription déjà faite reste modifiable sans le rôle. En
  jeu, la liste des rôles vient du compagnon d'un officier, sans relais dans la guilde. SR+ (`domain/softReserves.ts`), par personnage et par objet
  réservé : en remontant ses événements précédents, +10 quand il était présent, avait réservé l'objet et ne l'a pas
  obtenu ; neutre s'il était absent ou si l'événement n'avait pas le raid de l'objet ; arrêt à l'objet obtenu ou à une
  présence sans l'avoir réservé ; plafond +50. Conflits : le site fait foi, et la modification la plus récente gagne
  avant le verrouillage (un changement fait en jeu porte l'heure du jeu, ramenée à celle du site si elle la dépasse).
  En jeu : inscrits (icône de rôle, couleur de classe), mes SR, SR du raid avec SR+, invitations (Rejoindre invite les
  inscrits attendus avec leur personnage principal, Inviter tout le roster, passage en raid à la première
  acceptation).
- **Butin et journal** (`VXV_Raid`) : quand le maître du butin ouvre le corps, tout le raid voit le butin et ses SR.
  Attribution : une SR, sans roll ; plusieurs, roll entre elles avec le SR+ ; aucune, roll libre ; objet exclu, loot
  council. Rolls suivis en direct, annonces dans le canal du groupe, don d'un clic. Journal du raid diffusé par le
  maître du butin : boss tués, présents, morts, objets, dégâts et soins du compteur du jeu sur chaque boss tué
  (`Meter.lua`), résurrections acceptées (`Raised.lua`) ; envoyé par le compagnon ou exporté (`/vxv journal`), importé
  sur le site, corrigé par un officier avec motif. Tous les loots sont gardés avec leur mode (SR, SR+, roll libre,
  loot council) ; présences et loots nourrissent le SR+. Récap Discord de chaque raid le lendemain.
- **PvP** (site `/pvp`, bot) : sorties PvP créées par un officier (site, `/vxv_pvp`) comme les soirées de raid, avec
  un titre à la place des raids et sans SR (`events.kind`, `domain/events.ts`) : même rôle Discord réservé, mêmes
  inscriptions et rappels, message dans le salon PvP (`DISCORD_PVP_CHANNEL_ID`, salon des raids sans lui), page
  `/pvp/evenements/<id>`.
- **Prochain boss** (`VXV_Raid`) : dans l'instance d'un raid, son premier boss pas encore tué à l'événement (ordre du
  pack) ; ailleurs, le premier boss debout des raids de l'événement ; un joueur arrivé en retard apprend du maître du
  butin (ou du chef) les boss tués. Panneau en tête des SR du raid et dans le mode réduit ; alerte (message au milieu
  de l'écran, son de l'avertissement de raid) une fois par boss où le joueur a une SR, désactivable (`/vxv alerte`).
  Position relue toutes les 5 s (`Place.lua`, événement `raid.place`).
- **Compagnon** (`apps/companion`, Electron, Windows et Mac) : liaison au compte en un clic (navigateur, PKCE, jeton
  haché côté site, rôles relus sur Discord chaque heure) ; mises à jour depuis `MLDimo/vxv-compagnon`. Toutes les
  5 minutes, il écrit les données du site dans la boîte de réception de `VXV_Sync`, lue au `/reload` ; après chaque
  `/reload` ou déconnexion, il envoie au site ce que l'addon a rangé dans `VXV_SyncDB`. Dans les raids, il lit le
  journal de combat au fil de l'eau et envoie chaque boss tué. Rien d'autre ne passe du jeu au compagnon sans
  `/reload`, et pas de bouton ni de commande qui recharge l'interface (décision du propriétaire). Un nouveau lieu ne demande pas de nouvelle
  version : il recopie toute donnée de bundle que le site fournit et envoie tous les textes de `VXV_SyncDB.texts`.
- **Paris** (`VXV_Paris`, Le Dé Pipé › Paris ; site `/paris`) : ouverts par un officier (site, `/vxv_pari`, « Ouvrir un
  pari » en jeu, `UI/BetDialog.lua`), de 2 à 10 choix avec une heure de fermeture. Pièces d'or entières ; une mise par
  membre et par pari, modifiable ou retirable jusqu'à la fermeture tant qu'elle n'est pas notée payée. Part de
  l'organisation : 10 % de la cagnotte, jamais plus que les mises perdantes ; gains au prorata des mises, arrondis à la
  po inférieure, le reste à la caisse (`domain/bets.ts`). Résultat ou annulation par un officier. Seul le trésorier
  note l'or qui change de mains (`/paris/tresorerie`) ; une mise perdue non payée devient une dette, et toute dette
  (paris ou deathroll, `application/debts.ts`) bloque paris et deathrolls. Caisse de la guilde en ajout seul (part des
  paris, dons, dépenses, récompenses ; une erreur se corrige par un autre mouvement), sur la page gauche du Journal.
  Saisons lancées par un officier. Message Discord de chaque pari à jour à chaque mise, boutons « Miser » et « Retirer
  ma mise ».
- **Missions** (`VXV_Missions`, Quêtes ; site `/quetes`, `/vxv_mission`) : pêche (statistique 1456), herboristerie,
  minage et dépeçage (le jeu ne les compte pas : une fenêtre de butin avec une herbe, un minerai ou un cuir compte
  pour une récolte, `Gathering.lua`), victoires honorables (`GetPVPLifetimeStats`). Score : ce que gagnent les
  compteurs de tous les personnages liés du membre pendant la mission ; à égalité, le premier à l'atteindre. Compteurs
  lus à la connexion puis chaque minute hors combat. Résultat validé par un officier ; récompense 70 / 20 / 10 % versée
  par le trésorier depuis la caisse ; hall of fame. Message Discord avec le classement en direct.
- **Titres** (`VXV_Titles` ; règles dans `domain/titles.ts`) : chaque titre va au membre en tête de sa règle sur la
  saison (à égalité, le premier à l'atteindre ; sans score positif, à personne), réattribué chaque mercredi à 5 h UTC,
  avec l'historique, un rôle Discord « ◆ <titre> » et l'annonce de la semaine. Princesse : soins reçus sur les boss
  tués en raid VXV, lus dans le journal de combat, que l'addon allume avec son mode avancé dans l'instance d'un raid
  des packs et éteint en sortant s'il l'a allumé (`VXV_Raid/CombatLogging.lua`) ; le site garde le relevé le plus
  complet de chaque combat et retrouve les joueurs par prénom parmi les présents du journal du raid
  (`domain/bossFights.ts`). Un titre dont la mesure peut manquer des données (`OFFICER_TITLES`) se donne aussi par un
  officier sur Ranking › Titres, pour la semaine affichée, avec motif (`title.give`) ; le mercredi le recalcule. En
  jeu : une ligne dans l'infobulle d'un membre, ses titres avant ses messages dans le canal de guilde et après son nom
  dans la liste de guilde ; un nouveau titre ne demande pas de mise à jour de l'addon.
- **Artisans** (`VXV_Artisans` ; site `/artisans`) : niveaux des métiers relus à chaque connexion, recettes apprises à
  l'ouverture de la fenêtre du métier, pour chaque personnage du compte (seulement les métiers du joueur, au niveau de
  sa liste). La lecture la plus récente gagne ; un niveau relu sans ses recettes garde les recettes connues. Partage
  dans la guilde : chaque addon dit ses métiers quand ils changent et, à la connexion, la liste de ce qu'il a ; il
  demande en chuchotement ce qui lui manque ; un officier équipé du compagnon envoie au site ce qu'il entend. « Qui peut
  fabriquer… ? » sans accents ni casse. L'annuaire du site n'arrive que par le compagnon (trop gros pour le relais des
  officiers). Infobulle d'un objet de recette (`RecipeItems.lua`) : « Recette possédée par VXV » en vert ou « Recette
  non possédée par VXV » en rouge, le nom après « : » comparé sans accents ni casse ; rien sur les livres.
- **Deathroll** (`VXV_Deathroll`, Le Dé Pipé › Deathroll ; site `/paris/deathroll`) : défi chuchoté à un membre
  connecté avec VXV, accepté ou refusé dans la minute ; annonce à la guilde et une minute de paris (pas les joueurs,
  pas un membre endetté) ; puis chacun roll à son tour de 1 au résultat précédent (`RandomRoll`), le défié en premier,
  fin au premier 1. Fenêtre du duel animée et synchronisée chez toute la guilde. Partie finie envoyée au site, qui la
  vérifie, crée et règle le pari de la guilde avec les règles des paris ; dette du perdant jusqu'à la confirmation du
  gagnant (site ou jeu). Parties de 1 000 po et plus annoncées dans le salon des paris.
- **Ranking** (`VXV_Ranking` ; site `/ranking`) : Paris et Deathroll au gain net, Quêtes aux points de places (3, 2 et
  1 par quête validée), Titres aux semaines détenues (`domain/rankingBoards.ts`, égalités départagées par le nom), par
  période (toujours, mois, saison). Fanions des trois premiers, trois records, suite du classement, position du joueur
  en bas, comme la capture `docs/design/captures/ranking.jpg`. Le jeu ne fait pas tourner les cadres : pas de
  balancement des fanions.

## Design (charte « La Taverne »)

- Référence : `docs/design/VXV_Design_Spec.md`, maquettes HTML (valeurs CSS de référence) et captures (rendu attendu).
- Jetons dans `packages/design/src/tokens.ts`, seule source des couleurs et des polices. `npm run generate` écrit `tokens.css` (thème Tailwind du site) et `VXV_Core/UI/Tokens.lua` ; un test vérifie que les fichiers générés sont à jour.
- Pixel art : aucun arrondi (retirés du thème), reliefs en anneaux d'ombres pleines, survol prune et or, zones officier à liseré or.
- Pixelify Sans pour les titres, onglets, plaques, boutons et gros chiffres ; Manrope pour le texte, noms de joueurs compris. Polices et images servies par le site (`apps/web/public`), licences OFL à côté des polices. Chinois et coréen : familles de polices qui prennent celles du jeu pour ces alphabets.
- Un lieu = un onglet, même nom partout : Taverne, Raid, PvP, Le Dé Pipé, Quêtes, Ranking, Artisans, Journal. PvP est le mur des avis de recherche.
- Fond de chaque écran : la taverne cadrée sur son lieu, très sombre (`backdrop` de `packages/design/src/places.ts`),
  dans l'addon comme sur le site (`PlaceBackdrop`, pages rattachées à leur lieu par `placeOfPath`).
- Noms de joueurs toujours dans leur couleur de classe (`CLASS_COLORS`), et ces couleurs ne servent à rien d'autre.
- Avatars : portraits de la charte choisis par race, classe et sexe du personnage principal (transmis par l'addon), avec repli.
- Le site est réservé aux membres : un visiteur ne voit que la page de connexion.
- Addon : `VXV.Theme` (couleurs, polices, panneaux, boutons, anneaux) et `VXV.CreateDialog` ; aucun modèle de cadre ou de bouton du jeu (`UIPanelButtonTemplate`…), sauf la zone de saisie défilante de la fenêtre de copier-coller.
- Un module branche un lieu par `tab = { place, Build(content), Card(), Compact(content) }` : écran de la grande fenêtre, carte sous la Taverne (rafraîchie par l'événement `tavern.changed`), écran du mode réduit. Les écrans se construisent avec `VXV.Screen` (en-tête, badges, liste qui suit les événements du bus, écran simple du mode réduit) et `VXV.RowList` (lignes à la molette, `RowList.Row`) ; les deux fenêtres partagent `UI/PlaceWindow.lua` (onglets par lieu, position gardée). Plusieurs modules sur un même lieu ont chacun leur sous-onglet (`tab.name`, `tab.order`) ; la carte et le mode réduit viennent du premier qui les fournit. Le Dé Pipé : Paris, Deathroll.
- Dégradés et lueurs en petites images PNG (`VXV_Core/Media`) : `CreateColor`, nécessaire aux dégradés du jeu, n'est pas mesuré sur Forever.
- Un cadre posé sur un autre (page sur une couverture, carte sur un panneau) en est l'enfant : le jeu dessine les textures des cadres de même niveau calque par calque, et le fond du dessous recouvrirait celui du dessus.

## Structure du dépôt

Dépôt unique, espaces de travail npm (`apps/*`, `packages/*`, outils), Node 22 ou plus, npm 11 ou plus (npm 10.9 plante sur les dépendances optionnelles de Vitest 4). `npm audit` doit rester à zéro vulnérabilité.
La table complète est dans le README. Règles :

- Un dossier n'est créé que quand il a du contenu (YAGNI).
- `apps/` contient les applications déployées, `packages/` le code TypeScript partagé, `addon/` les bundles Lua.
- Paquets nommés `@vxv/<nom>`. Une application ne dépend jamais d'une autre application, seulement de `packages/`.

## Principes non négociables

- **DRY, SOLID, KISS, YAGNI** sur tout le code, sans exception.
- **Clean architecture** : le domaine ne dépend de rien ; l'infrastructure (Blizzard, Supabase, Discord) est derrière des adaptateurs.
- **Bundles indépendants** : chaque fonctionnalité est un bundle (`VXV_Core`, `VXV_Raid`, `VXV_Data_<Raid>`, `VXV_Sync`, `VXV_Paris`, `VXV_Missions`, `VXV_Titles`, `VXV_Artisans`, `VXV_Deathroll`, `VXV_Ranking`) qui ne dépend que du socle.
- La base de données fait foi. Discord, le site, le compagnon et l'addon ne sont que des points d'accès.
- Droits contrôlés par le serveur, jamais par l'addon ni le compagnon. Rôles cumulables (officier, trésorier, GM) ; seul le trésorier a les droits de trésorerie ; tout membre du serveur Discord est membre de la guilde.
- Toute action d'officier passe par un journal non effaçable avec motif obligatoire.
- Nouveau raid = nouvelles données (JSON), jamais de modification de code.
- Membres : zéro effort. Installer l'addon suffit. L'addon n'est ouvert à la guilde qu'une fois tout terminé.

## Workflow git et tests

- Commits au format Conventional Commits : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
- Une branche par changement, fusionnée dans `main` par pull request une fois la CI verte.
- `npm run check` lance toutes les vérifications. Le hook `pre-push` (activé par `npm install`) bloque tout push si l'une échoue. Ne jamais le contourner (`--no-verify` interdit).
- `main` n'est pas protégée côté GitHub : la discipline repose sur le hook et la CI.
- À chaque push, décider explicitement si la nouveauté mérite un test unitaire, et le justifier dans la pull request.
- Flux GitHub : `tests.yml` (réutilisable, seul endroit où sont définis les tests) ; `ci.yml` (demandes de fusion et `main` : tests puis déploiement du site) ; `deploy-database.yml` ; `release-addon.yml` ; `release-companion.yml` (étiquettes `compagnon-v<semver>`, installeurs publiés dans `MLDimo/vxv-compagnon`). Tout déploiement dépend de `tests.yml`.
- Versions de l'addon : étiquettes `v<semver>` sur `main` ; aucune n'est encore publiée.

## Conventions Lua (addons)

- Lua 5.1, `## Interface: 16001` (WoW Forever, API Mainline 12.x avec restrictions Midnight).
- Code, noms et commentaires en anglais. Textes affichés aux joueurs en français.
- Espace de noms privé `local ADDON_NAME, ns = ...`. Aucune globale hors SavedVariables, slash commands et fichiers `External/`.
- `VXV_Core` expose une seule globale, `VXV` : l'API publique des bundles (modules, bus interne, messages entre addons, événements du jeu, fenêtres, infobulle), décrite dans `addon/VXV_Core/Api.lua`. Les bundles ne voient rien d'autre du socle, et n'y ajoutent que ce qu'ils utilisent.
- Packs de données `VXV_Data_<Raid>` : générés par `npm run generate` (jamais modifiés à la main) dans `dist/generated/addon`. Chacun enregistre son raid dans la globale partagée `VXV_RaidData[raidId]`, seul point de contact avec `VXV_Core`. Ils dépendent de `VXV_Core` et se chargent avec le jeu (quelques Ko chacun ; le chargement à la demande, `C_AddOns.LoadAddOn`, n'est pas mesuré sur Forever) ; `VXV_Raid` y trouve le raid de l'instance où se trouve le joueur.
- Données sauvegardées (`VXV_DB`) : numéro de schéma, et migrations appliquées au chargement ; une migration publiée ne change plus.
- Un fichier = une responsabilité. Module exposé via `ns.<Module>` ; dépendances lues en tête de fichier (`local Util = ns.Util`).
- Nommage : `PascalCase` pour modules et fonctions publiques, `camelCase` pour locales, `UPPER_SNAKE_CASE` pour constantes. Pas de nombre magique.
- Indentation 4 espaces, 120 caractères max, lint via `.luacheckrc`.
- Tout appel à une API Blizzard dont le nom varie passe par `Compat` (contrat `ok, ...` façon `pcall`).
- Toute valeur venant du client peut être « secrète » : passer par `VXV.IsSecret` (`Util.IsSecret`) avant de comparer, concaténer ou stocker.
- SavedVariables lues uniquement dans `ADDON_LOADED` de l'addon, jamais au chargement du fichier.
- `ReloadUI()` est protégée sur Forever : demander au joueur de taper `/reload`.
- Ordre de chargement dans le `.toc` : `Core` (outillage générique) puis modules métier puis `Bootstrap.lua` en dernier. Un nouveau dossier d'addon demande de relancer le jeu, pas seulement `/reload`.
- La sonde `tools/VXV_Probe` passe `npm run check` avant `tools/install-probe.sh` ; le banc vérifie aussi ses lignes et ses globales.

## Formats échangés

Textes en lignes : la première porte le format et sa version (tout changement de format incrémente le numéro), puis une
ligne par enregistrement, son type en premier champ. Le détail de chaque ligne est dans le fichier qui l'écrit ou la lit
(`domain/` est `packages/server/src/domain/`, les bundles sont dans `addon/`).

| Format | Sens | Écrit par | Lu par |
| --- | --- | --- | --- |
| `VXV-ROSTER-1` (`Prénom;Nom;CLASSE`, classe = jeton du jeu) | addon → site | `VXV_Core/Core/Roster.lua` (`/vxv liste`) | `domain/roster.ts` |
| `VXV-LOG-2` (journal d'un raid) | addon → site | `VXV_Raid/RaidLog.lua` | `domain/raidLog.ts` |
| `VXV-METIERS-1` (métiers d'un personnage) | addon → site | `VXV_Artisans/Website.lua` | `domain/artisans.ts` |
| `VXV-DEATHROLL-1` (une partie, ligne `Y` : paiement confirmé) | addon → site | `VXV_Deathroll/Games.lua` | `domain/deathrolls.ts` |
| `VXV-COMBAT-1` (boss tués, soins reçus) | compagnon → site | `apps/companion/src/domain/combatLog.ts` | `domain/bossFights.ts` |
| `VXV-RAID-3` (événement) | site → addon | `domain/addonExport.ts` | `VXV_Raid/EventData.lua` |
| `VXV-ROLES-1` (rôles d'un événement, pour les officiers) | site → addon | `domain/addonEventRoles.ts` | `VXV_Raid/RoleChoices.lua` |
| `VXV-PARIS-1` | site → addon | `domain/addonBets.ts` | `VXV_Paris/BetsData.lua` |
| `VXV-QUETES-1` | site → addon | `domain/addonMissions.ts` | `VXV_Missions/QuestsData.lua` |
| `VXV-TITRES-1` (noms et règles compris) | site → addon | `domain/addonTitles.ts` | `VXV_Titles/TitlesData.lua` |
| `VXV-ARTISANS-1` (annuaire) | site → addon | `domain/addonArtisans.ts` | `VXV_Artisans/ArtisansData.lua` |
| `VXV-DEATHROLLS-1` (bloqués, dettes, classement) | site → addon | `domain/addonDeathrolls.ts` | `VXV_Deathroll/DeathrollData.lua` |
| `VXV-RANKING-1` (25 premiers de chaque tableau) | site → addon | `domain/addonRanking.ts` | `VXV_Ranking/RankingData.lua` |

- Vers le site : chaque texte se lit avec `domain/textFormat.ts` (lignes numérotées, un lecteur par type de ligne,
  `TextFormatError`).
- Vers l'addon : chaque format commence par les mêmes lignes `P` (export), `O` (officiers) et `M` (personnages des
  membres, lus par `VXV.MemberOf`), écrites par `addonHead` (`domain/addonText.ts`), et porte les réponses aux
  changements faits en jeu. `VXV.SiteData` (`VXV_Core/Core/SiteData.lua`) les lit, les garde, les prend du compagnon,
  du collage d'un officier (`/vxv importer`) et du relais des officiers (`Core/SharedData.lua`). Confiance entre
  addons : des données ne sont gardées que si leur expéditeur figure parmi les officiers nommés par le site, dans les
  nouvelles données comme dans celles déjà gardées.
- Compagnon ↔ addon : il écrit `VXV_Sync/External/Inbox.lua` (`ns.Inbox`, sans globale, format numéroté) et lit
  `VXV_SyncDB` sans l'exécuter (`@vxv/lua`) ; contrats dans `addon/VXV_Sync/Companion.lua` et `Outbox.lua`, et
  `apps/companion/src/domain/inbox.ts` et `outbox.ts`. Les autres bundles passent par le bus du socle : `sync.inbox`
  (données apportées), `sync.put` (kind, clé, valeur à envoyer), `modules.started` (tous les modules démarrés) ; les
  textes à envoyer vont dans `VXV_SyncDB.texts`, par type puis clé (le site lit les types qu'il connaît).
- Compagnon ↔ site : `apps/web/app/api/compagnon` (`jeton`, `moi`, `donnees`, `envoi`), jeton porteur.

## Zéro erreur Lua chez les joueurs

Chaque famille d'erreur courante des addons est couverte par un test automatique avant toute version publiée.

| Erreur courante | Prévention | Test automatique |
| --- | --- | --- |
| API absente du client (anciennes globales, fonctions renommées) | Couche Compat uniquement | Toute globale lue par l'addon figure dans la liste des API mesurées sur Forever (inventaire de la sonde, base d'API capturée) |
| Événement inconnu ou interdit (`COMBAT_LOG_EVENT_UNFILTERED`) | Liste fermée d'événements | Chaque événement enregistré figure dans la liste validée par la sonde |
| SavedVariables lues trop tôt ou absentes au premier lancement | Lecture dans `ADDON_LOADED`, valeurs par défaut, migrations versionnées | Scénarios « première installation » et « mise à jour depuis la version précédente » |
| Valeurs secrètes comparées ou concaténées | `Util.IsSecret` | Simulateur renvoyant des noms secrets en combat |
| Action protégée en combat (cadres sécurisés, bouton minimap, `ReloadUI`) | Aucune action protégée, report après le combat | Simulateur avec `InCombatLockdown()` vrai, aucun `ADDON_ACTION_BLOCKED` |
| Bouton minimap : base de position nulle, forme de minimap inconnue, doublon avec le compartiment d'addons | Création après `ADDON_LOADED`, valeurs par défaut | Scénario sans données sauvegardées, et minimap sans `GetMinimapShape` |
| Objet pas encore en cache (`C_Item.GetItemInfo` renvoie nil) | Attente de `ITEM_DATA_LOAD_RESULT` | Simulateur renvoyant nil au premier appel |
| Globales qui fuient ou écrasent une autre addon, remplacement de fonctions Blizzard (taint) | Espace de noms privé, `hooksecurefunc` seulement | Analyse statique des globales (luacheck ou équivalent) en CI |
| Syntaxe hors Lua 5.1 | — | Analyse de syntaxe Lua 5.1 |
| Messages addon trop longs, trop rapides ou pendant un boss | File d'envoi de VXV_Core | Tests de la file : découpage 255 octets, débit, verrou de rencontre |
| Troncature d'un nom accentué au milieu d'un caractère | Découpage UTF-8 sûr | Tests sur des noms comme « Ðéjà Vu » |
| Ordre de chargement des bundles | Dépendances déclarées dans les `.toc` | Chargement des bundles dans l'ordre du client par le simulateur |

Outil : le banc d'essai `tools/addon-harness` (fengari + client simulé, tests Vitest) charge chaque addon comme le jeu, d'après son `.toc`, et porte ces scénarios.

## Architecture du serveur (`@vxv/server`)

Partagé par le site et le bot. Trois couches, vérifiées par ESLint :
- `domain/` : règles pures, aucune dépendance.
- `application/` : cas d'usage ; ne connaissent que les interfaces de `ports.ts` (dépôts, unité de travail, horloge) et de `discordPorts.ts` (serveur de la guilde, annonces du bot).
- `infrastructure/` : SQL brut sur PostgreSQL (`SqlClient` : pg en production, PGlite dans les tests).
Dans une transaction, une requête après l'autre : le client d'une transaction n'en exécute qu'une à la fois (pg
déprécie la file d'attente), donc pas de `Promise.all` dans `application/` ni `infrastructure/` (règle ESLint).
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
- Une variable d'environnement facultative du site reste commentée dans `apps/web/.env.example` : la CI exige sur Vercel toutes les autres.

## Base de données (Supabase)

- Migrations SQL dans `supabase/migrations`, nommées `AAAAMMJJHHMMSS_sujet.sql`, jamais modifiées une fois fusionnées : toute évolution passe par une nouvelle migration.
- Toutes les tables activent la sécurité par ligne sans politique : seul le serveur (rôle service) lit et écrit.
- Le journal (`journal`) est en ajout seul, motif obligatoire, garanti par des triggers.
- Déploiement : `tools/deploy-database.sh` (migrations puis données de raid), automatique vers test, manuel vers production (voir le README).
- Une migration lue par le code fusionné se déploie en production aussitôt la fusion faite (`deploy-database.yml`, cible production) : le site part en production automatiquement, la base non.
- Les règles d'intégrité vivent dans le schéma (contraintes) et sont couvertes par des tests PGlite (`supabase/tests`). `@vxv/database/testing` fournit une base migrée pour les tests des autres paquets.

## Contraintes WoW Forever

Mesurées par la sonde (détail et journaux : `docs/phase-0/resultats.md`).

- Client moderne : utiliser uniquement les API `C_*`. Les anciennes globales sont absentes (`SendAddonMessage`, `GetLootMethod`, `InviteUnit`, `ConvertToRaid`, `GetNumSkillLines`, `GetNumTradeSkills`).
- SavedVariables relues après `/reload` et après redémarrage. Un fichier Lua réécrit par un programme externe est relu au `/reload` ou au lancement suivant (jusqu'à 2 Mo au moins).
- Pas de royaume côté joueur. Un personnage = prénom + nom de famille, couple unique dans tout le jeu (clé naturelle) : `UnitName` renvoie le prénom puis le nom de famille à la place du royaume, `GetUnitName(unit, true)` renvoie « Prénom Nom ». Pas de serveur mais un type de monde (PvE, PvP, RP, HC), que `GetRealmName()` reflète (ex. « Classic Beta PvP ») : il est commun à toute la guilde, donc hors de l'identité d'un personnage.
- Noms secrets : seulement ceux des ennemis en combat. Joueurs et membres du groupe restent lisibles, même pendant un boss.
- Messages addon : 255 octets maximum (au-delà, tronqués sans erreur), 10 envois d'affilée par préfixe puis 1 par seconde, et bloqués pendant une rencontre de boss uniquement (`AddOnMessageLockdown`, verrou levé juste après ENCOUNTER_END). Expéditeur au format « Prénom Nom ». Sur GUILD, l'expéditeur ne reçoit pas ses propres messages (contrairement à PARTY).
- Boss tué = `ENCOUNTER_END` avec succès ; `BOSS_KILL` et `ENCOUNTER_LOOT_RECEIVED` ne se déclenchent pas.
- Gagnant d'un objet en butin de groupe : `C_LootHistory.GetSortedInfoForDrop` (nom, classe, GUID, jet).
- Maître du butin : interface classique présente (`MasterLooterFrame`, `GiveMasterLoot`, captable par `hooksecurefunc`). L'addon peut appeler `GiveMasterLoot`, même pendant un boss. Liste de guilde : `GetGuildRosterInfo`, pas plus d'une demande toutes les 10 s.
- Sans clic du joueur (réaction à un événement) : `C_PartyInfo.InviteUnit`, `C_PartyInfo.ConvertToRaid`, `C_ChatInfo.SendChatMessage` (hors boss) et `RandomRoll` fonctionnent.
- `/roll` : lu dans CHAT_MSG_SYSTEM avec le format du jeu `RANDOM_ROLL_RESULT`, pour tous les joueurs.
- Pendant une rencontre de boss : envoi de chat bloqué (ADDON_ACTION_BLOCKED, même depuis un clic), messages du groupe et messages système secrets (`/roll` compris). Tout redevient normal après ENCOUNTER_END.
- Statistiques lisibles hors combat (196 compteurs), dont « Poissons et autres objets pêchés » (1456) et « Nombre total de victoires honorables » (588) ; aucun compteur de récoltes (herbes, minerais, peaux).
- `string.format` du jeu (Lua 5.1) refuse `nil` et les booléens ; le banc d'essai est aussi strict.
- Compteur de dégâts du jeu (`C_DamageMeter`) : secret pendant le combat, lisible après pour tout le groupe ; nom secret pour un joueur qui a quitté le groupe.
- Morts du groupe : `UnitIsDeadOrGhost` et les noms des membres restent lisibles pendant un boss.
- Affichage : infobulles via `TooltipDataProcessor`, canal de guilde via le filtre des messages, liste de guilde moderne (`CommunitiesFrame`) via `ScrollUtil.AddInitializedFrameCallback`.
- Métiers : `GetProfessions` et `GetProfessionInfo` (nom, niveau, maximum, ligne de compétence) ; recettes connues via `C_TradeSkillUI` (`GetBaseProfessionInfo`, `GetAllRecipeIDs`, `GetRecipeInfo` avec `learned`), une seconde après `TRADE_SKILL_SHOW`, quand la fenêtre du métier est ouverte. `TRADE_SKILL_UPDATE` refusé (`TRADE_SKILL_LIST_UPDATE` accepté).
- `COMBAT_LOG_EVENT_UNFILTERED` interdit : le client émet ADDON_ACTION_FORBIDDEN, sans erreur Lua.
- Journaux écrits par le jeu : l'addon allume sans clic `LoggingCombat(true)`, `LoggingChat(true)` et le mode avancé
  (`advancedCombatLogging`). Le journal de combat (`Logs/WoWCombatLog-*.txt`) s'écrit pendant la partie (soins reçus
  compris ; joueurs par prénom et GUID, sans nom de famille) ; le journal du chat n'est écrit qu'à la fermeture du jeu.
  Canal de discussion privé : envois sans clic bloqués.
- `PlaySound` et `SOUNDKIT` présents ; événements `PLAYER_ENTERING_WORLD` et `ZONE_CHANGED_NEW_AREA` acceptés.
- Habillage : textures PNG et TGA de l'addon affichées nettes en `NEAREST`, même hors puissance de deux ; polices TTF de l'addon chargées en différé (premier `SetFont` à `false`) ; chinois et coréen absents de nos polices, affichés par une famille de polices (`CreateFontFamily`) qui prend les polices du jeu pour ces alphabets ; `RAID_CLASS_COLORS`, `C_ClassColor`, `UnitRace`, `UnitSex` et `UnitClass` présents.

## graphify

Graphe du code, de la documentation et du schéma SQL dans `graphify-out/`, local à chaque machine (ignoré par git ;
`.graphifyignore` écarte les fichiers générés, les journaux de la sonde et les médias).

- Pour une question sur le code, d'abord `graphify query "<question>"`, puis `graphify path "<A>" "<B>"` pour le lien
  entre deux éléments et `graphify explain "<concept>"` pour un concept : ils renvoient un sous-graphe ciblé, plus court
  que `graphify-out/GRAPH_REPORT.md` ou une recherche brute.
- `graphify-out/GRAPH_REPORT.md` seulement pour une vue d'ensemble de l'architecture.
- Après une modification du code ou un `git pull` : `graphify update .` (analyse locale, sans appel à un modèle).
- Pas de `graphify hook install` : les hooks git du projet vivent dans `.githooks` (dont le `pre-push`).
