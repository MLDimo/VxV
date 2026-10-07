# Phase 0 — Protocole de test

Chaque test laisse une trace dans le journal de la sonde. À la fin d'une session, taper `/vxvtest report`,
copier le contenu (Ctrl+C) et le coller dans `docs/phase-0/sessions/<date>.txt`.

Rappels sur la sonde :

- `/vxvtest` affiche l'aide complète.
- `/vxvtest verbose` affiche aussi les lignes de détail (TRACE) dans le chat. Elles sont toujours dans le rapport.
- Chaque ligne indique le contexte : monde ou instance, groupe ou raid, boss en cours, verrou du chat.
- Le journal est aussi écrit dans `WTF/Account/<COMPTE>/SavedVariables/VXV_Probe.lua` à chaque `/reload` et à la déconnexion.
  Ce fichier peut être lu directement à la place du copier-coller.

## 0.1 Préparer l'environnement

1. Installer BugSack et BugGrabber dans le dossier AddOns du client Forever, en version à jour (leur `.toc` doit citer 16001).
2. Copier la sonde dans le client. Relancer cette commande après chaque modification de la sonde :

   ```sh
   tools/install-probe.sh "<dossier WoW>/_classic_beta_"
   ```

   Le client Forever est installé dans `_classic_beta_` (build 1.60.x). Pas de lien symbolique : le disque peut être en FAT32.

3. Lancer le jeu. Sur l'écran des personnages, bouton AddOns : vérifier que VXV_Probe, BugSack et BugGrabber sont cochés.
   Si l'un d'eux est marqué « périmé », cocher « Charger les addons périmés ».
4. En jeu, le message « VXV_Probe chargé (interface client …) » doit apparaître.
5. Taper `/vxvtest api run`, puis `/reload` pour écrire le journal sur le disque.

## 0.3 Communication entre addons

Il faut au moins deux joueurs avec la sonde, idéalement trois.

| Situation | Commande (joueur A) | À vérifier chez B |
| --- | --- | --- |
| Hors groupe, en ville | `/vxvtest comm ping GUILD` | PING reçu, PONG reçu chez A |
| En groupe, hors instance | `/vxvtest comm ping` | Reçu sur GUILD et PARTY |
| En raid, hors instance | `/vxvtest comm ping` | Reçu sur GUILD et RAID |
| En raid, dans l'instance | `/vxvtest comm ping` | Idem, noter INSTANCE_CHAT |
| En raid, pendant un boss | `/vxvtest comm ping` | Noter tout refus et le motif |
| Taille | `/vxvtest comm size RAID` | Dernière taille reçue intacte |
| Débit | `/vxvtest comm burst GUILD 30` | Nombre reçu sur 30, premier refus côté A |

À noter : les noms d'expéditeur reçus (format, espace, valeur secrète) et tout message « verrou-chat » dans le contexte.

## 0.4 Boss et loot

L'écoute est permanente dès la connexion. Il suffit de jouer un vrai raid ou un donjon.

1. Avant le premier boss : `/vxvtest loot status` (instance, méthode de butin, rencontre en cours).
2. Le chef de raid passe en maître du butin si l'option existe. Refaire `/vxvtest loot status`.
3. Tuer un boss : vérifier ENCOUNTER_START, ENCOUNTER_END, BOSS_KILL, ENCOUNTER_LOOT_RECEIVED.
4. Le maître du butin ouvre le corps : la sonde liste les objets et les candidats.
5. Il attribue un objet : la ligne « GiveMasterLoot … attribué à … » doit apparaître chez lui.
6. Chez les autres joueurs : noter quel événement signale l'attribution (CHAT_MSG_LOOT, ENCOUNTER_LOOT_RECEIVED…).

## 0.5 Noms et liste de guilde

1. `/vxvtest names unit` puis cibler un joueur et `/vxvtest names unit target`.
2. Vérifier le format prénom + nom, la présence d'espace et d'éventuelles valeurs secrètes.
3. `/vxvtest names roster` : nombre de membres, classe, rang, noms avec espace.
4. Refaire le point 1 pendant un combat de boss pour voir si les noms deviennent secrets.

## 0.6 Fichiers

**SavedVariables**

1. Taper `/vxvtest files payload 64`, puis `/reload`.
2. Au rechargement, la sonde affiche le numéro de chargement et le bloc relu.
3. Quitter complètement le jeu, relancer, `/vxvtest files check`. Le numéro doit avoir augmenté.

**Fichier déposé par un programme externe** (simule le compagnon)

1. Jeu lancé, exécuter :

   ```sh
   tools/write-inbox.sh "<dossier WoW Forever>/Interface/AddOns/VXV_Probe" 64
   ```

2. En jeu, `/reload` puis `/vxvtest files check`. L'Inbox doit indiquer « écrit par write-inbox.sh ».
3. Refaire avec 512 puis 2048 Ko pour connaître la taille supportée.

**Contournement « seed »** (seulement si les SavedVariables ne sont pas relues)

1. Quitter le jeu.
2. Copier le fichier de sauvegarde dans l'addon :

   ```sh
   cp "<dossier WoW Forever>/WTF/Account/<COMPTE>/SavedVariables/VXV_Probe.lua" \
      "<dossier WoW Forever>/Interface/AddOns/VXV_Probe/External/Seed.lua"
   ```

3. Relancer. La ligne « seed » indique si le client conserve ces données ou les efface.
4. Remettre ensuite `External/Seed.lua` dans son état d'origine (`git checkout tools/VXV_Probe/External`).

## Compléments du 3 octobre (T1 à T10)

Tests ajoutés par les décisions du 3 octobre (`docs/plan/decisions-2026-10-03.md`), à faire avant la fin de la bêta.
Après chaque série : `/reload` pour écrire le journal, ou `/vxvtest report` pour le copier.

**Sans clic.** `/vxvtest later <test> <commande>` lance la commande 3 secondes plus tard, hors du clic du joueur.
C'est ainsi que le vrai addon agira quand il réagit à un événement (inviter un inscrit, annoncer un gagnant).
Le jeu bloque certaines actions qui ne viennent pas d'un clic : la ligne `[client] FAIL action bloquée` le signale.
Pour chaque action ci-dessous, faire la commande directe, puis la même précédée de `later`.

**Seul, en ville**

| Test | Commandes | À vérifier |
| --- | --- | --- |
| T5 roll par un bouton | `/vxvtest rolls button`, cliquer sur le bouton ; puis `/vxvtest later rolls roll` | Le jet apparaît dans le chat et la ligne « roll lu » suit |
| T3 lecture des `/roll` | Taper `/roll` à la main | Ligne « roll lu : [Prénom Nom] n (1-100) » |
| T7 compteur de dégâts | `/vxvtest meter list` ; taper un mannequin d'entraînement ou un monstre ; `/vxvtest meter read` pendant puis après le combat | Fonctions et types présents ; montants et noms lisibles, ou secrets |
| T8 compteurs du jeu | `/vxvtest counters list` | Nombre de compteurs lus et valeurs plausibles (créatures tuées, morts…) |
| T9 infobulle et canal de guilde | `/vxvtest display on`, survoler un joueur, attendre un message de guilde | « [Titre VXV] » dans l'infobulle et devant les messages de guilde |
| T9 liste de guilde | Même session : ouvrir la fenêtre de guilde, onglet de la liste des membres, la faire défiler | « [Titre VXV] » après les noms ; sinon la ligne « nom introuvable » décrit une ligne de la liste |
| T10 métiers et recettes | `/vxvtest professions list` ; ouvrir la fenêtre de chaque métier | Métiers et niveaux ; « n recette(s) connue(s) » à l'ouverture (sinon `/vxvtest professions recipes`, fenêtre ouverte) |

**En groupe (au moins deux joueurs, un seul avec la sonde suffit)**

| Test | Commandes | À vérifier |
| --- | --- | --- |
| T1 invitations | `/vxvtest group status` ; `/vxvtest group invite Prénom Nom` ; quitter le groupe ; `/vxvtest later group invite Prénom Nom` | L'invitation arrive chez l'autre joueur dans les deux cas ; sinon le message d'erreur |
| T1 passage en raid | En chef de groupe : `/vxvtest group raid`, puis dans un autre groupe `/vxvtest later group raid` | Le groupe devient un raid |
| T3 `/roll` des autres | L'autre joueur tape `/roll` | « roll lu » avec son nom |
| T4 canal raid | En raid : `/vxvtest chat send`, `/vxvtest later chat send`, `/vxvtest chat send RAID_WARNING` | Messages visibles chez les autres ; ligne « CHAT_MSG_RAID lu » ; refus éventuel |
| T4 pendant un boss | `/vxvtest chat send` pendant la rencontre | Message envoyé ou refusé (contexte « verrou-chat ») |
| T6 morts et résurrections | `/vxvtest deaths watch` avant un combat ; mourir ou voir mourir un membre ; se faire relever | Lignes « mort : » et « relevé : », PLAYER_DEAD, RESURRECT_REQUEST avec le nom du soigneur |

**En raid, maître du butin, sur un boss de donjon** (T2, complète le point 0.4)

1. `/vxvtest loot status` : la ligne « je suis maître du butin : true » doit apparaître.
2. Ouvrir le corps du boss : la sonde liste chaque emplacement et ses candidats numérotés (« 1=Prénom Nom »).
3. Donner un objet avec le menu du jeu : ligne « GiveMasterLoot … attribué à … ».
4. Donner un autre objet par l'addon : `/vxvtest loot give <emplacement> <n° du candidat>`, puis la même chose avec `later`.
   Vérifier que l'objet part bien chez le joueur choisi.

## Complément du 7 octobre (T11) : vers le compagnon sans `/reload`

Le jeu n'écrit ses données sauvegardées qu'au `/reload` ou à la déconnexion. Deux fichiers qu'il écrit pendant la partie
pourraient porter les données au compagnon : le journal de combat (`Logs/WoWCombatLog*.txt`, ce que lit Warcraft Logs)
et le journal du chat (`Logs/WoWChatLog.txt`). Sonde 0.4.0 (`tools/install-probe.sh`, puis `/reload`). Les fichiers sont
lus sur le disque pendant que le jeu tourne : prévenir avant de se déconnecter.

| Étape | Commandes | À vérifier |
| --- | --- | --- |
| Inventaire | `/vxvtest api find logging`, `/vxvtest api find channel` | Les fonctions des journaux et des canaux présentes sur Forever |
| Activation sans clic | `/vxvtest later journaux start` | L'addon allume seul les deux journaux et rejoint le canal privé `VxvSonde` (sinon « action bloquée ») |
| Combat | Combattre un monstre en recevant des soins (d'un autre joueur si possible, sinon une potion ou un bandage) | Le journal de combat s'écrit pendant la partie, avec les soins reçus |
| Messages sans clic | `/vxvtest later journaux send` | Ce que le journal du chat contient : affichage de l'addon, message d'addon, chuchotement à soi, canal (caché ou non, 255 octets, rafale de 10) ; refus éventuels |
| Activation au clavier | Si l'étape sans clic est refusée : `/vxvtest journaux start` puis `/vxvtest journaux send` | Les mêmes, depuis une commande tapée |
| Fin | `/vxvtest journaux stop`, puis `/reload` | Journal de la sonde dans `VXV_Probe.lua` |

## 0.7 Rapport

Remplir `docs/phase-0/rapport-faisabilite.md` à partir des rapports de session.
