# Le compagnon VXV (P7)

Application de bureau (Windows et Mac) qui relie le jeu au site, sans copier-coller. Facultative pour les membres,
indispensable aux officiers. Code : `apps/companion` ; versions publiées : https://github.com/MLDimo/vxv-compagnon.

## Pour les joueurs

1. Télécharger l'installeur depuis la page « Compagnon » du site.
   - Windows : si « Windows a protégé votre ordinateur » s'affiche, cliquer sur « Informations complémentaires »
     puis « Exécuter quand même » (le compagnon n'a pas encore de certificat). Il s'installe pour l'utilisateur seul,
     sans droits d'administrateur.
   - Mac : ouvrir le DMG et glisser VXV Compagnon dans Applications. Au premier lancement, si macOS refuse de l'ouvrir :
     Réglages Système, Confidentialité et sécurité, « Ouvrir quand même » (sur les versions plus anciennes de macOS :
     clic droit sur l'application, puis « Ouvrir »).
2. Dans le compagnon, « Relier mon compte » : le navigateur ouvre le site, on confirme, et c'est fait.
3. Le compagnon trouve tout seul les versions du jeu où l'addon VXV est installé (dossiers habituels, disques externes).
   Sinon : « Choisir le dossier » et indiquer le dossier de World of Warcraft.
4. Il démarre avec l'ordinateur, caché près de l'horloge (désactivable dans sa fenêtre), et fait le reste :
   - toutes les 5 minutes, il prépare pour le jeu les données du prochain raid, des paris, des quêtes et des titres :
     en jeu, `/reload` les charge (depuis la version 1.2, il apporte aussi les données de tout nouveau lieu sans mise
     à jour) ;
   - après chaque `/reload` ou déconnexion, il envoie au site ce que l'addon a enregistré (inscription, SR et mises
     faites en jeu, compteurs du jeu pour les missions, métiers des personnages, et pour un officier : exclusions,
     événements créés, liste de guilde, journaux de raid). La modification la plus récente gagne : un changement fait en jeu avant une
     modification sur le site n'est pas appliqué.

Mises à jour : automatiques sous Windows (installées à la fermeture du compagnon, ou tout de suite avec « Redémarrer ») ;
sur Mac, le compagnon annonce la nouvelle version et ouvre la page de téléchargement.

## Ce qui circule

| Sens | Comment | Contrat |
| --- | --- | --- |
| Site → jeu | Le compagnon écrit `Interface/AddOns/VXV_Sync/External/Inbox.lua`, lu au `/reload` | `apps/companion/src/domain/inbox.ts` ↔ `addon/VXV_Sync/Companion.lua` |
| Jeu → site | L'addon remplit `VXV_SyncDB` (`WTF/Account/*/SavedVariables/VXV_Sync.lua`), lu sans être exécuté | `addon/VXV_Sync/Outbox.lua` ↔ `apps/companion/src/domain/outbox.ts` |
| Compagnon ↔ site | `apps/web/app/api/compagnon` : `jeton` (liaison), `moi`, `donnees`, `envoi` | jeton porteur, droits revérifiés sur Discord chaque heure |

Le site fait foi : il vérifie chaque droit (liste et journaux réservés aux officiers, changement d'un autre joueur relayé
par un officier seulement) et ne garde qu'une fois ce que plusieurs joueurs envoient. Le récap Discord d'un raid part le
lendemain matin (tâche quotidienne de 7 h UTC), depuis le journal le plus complet reçu.

## Développement

```sh
npm run dev -w @vxv/web                                          # le site en local
VXV_SITE_URL=http://localhost:3000 npm start -w @vxv/companion   # le compagnon relié au site local
npm run package -w @vxv/companion                                # installeur de la plateforme, dans apps/companion/release
```

Depuis le terminal de VS Code, retirer `ELECTRON_RUN_AS_NODE` s'il est défini (`env -u ELECTRON_RUN_AS_NODE …`) : sinon
Electron se comporte comme Node et ne trouve pas son module `electron`.

## Publier une version

Une étiquette `compagnon-v<version>` sur `main` lance `.github/workflows/release-companion.yml` : tests, installeurs
Windows et Mac (universel Intel et puces Apple, signature ad hoc), puis publication dans le dépôt public sous
l'étiquette `v<version>`, où les compagnons installés trouvent leur mise à jour.

```sh
git tag compagnon-v1.0.0 && git push origin compagnon-v1.0.0
```

Un lancement manuel du flux construit les installeurs sans rien publier. Une version avec un tiret (`1.1.0-beta.1`) est
publiée en préversion, que les compagnons installés ignorent.

Mise en place (une fois) : créer sur GitHub un jeton à portée fine (Settings, Developer settings, Fine-grained tokens),
limité au dépôt `MLDimo/vxv-compagnon`, permission « Contents : Read and write », puis l'enregistrer sans l'afficher :

```sh
gh secret set COMPANION_RELEASES_TOKEN
```

Sans ce secret, le flux construit les installeurs et le signale, sans publier.
