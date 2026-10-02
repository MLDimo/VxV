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

## 0.7 Rapport

Remplir `docs/phase-0/rapport-faisabilite.md` à partir des rapports de session.
