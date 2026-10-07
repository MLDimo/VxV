# Décisions du 7 octobre 2026

Décisions du propriétaire, prises au fil de la journée.

## Code

- Refacto complète avant la mise en production (P10) : DRY et SRP en priorité, architecture propre, rien d'inutile
  (#106).
- Le dépôt GitHub `MLDimo/VxV` devient public : les 2 000 minutes d'Actions du mois sont épuisées, et un dépôt public
  n'en consomme pas. Le propriétaire le repassera en privé après la remise à zéro du 1er novembre.

## Artisans

- L'infobulle d'un objet de recette dit si la guilde la connaît : « Recette possédée par VXV » en vert, « Recette non
  possédée par VXV » en rouge (#107).

## Titres

- Les titres que le jeu ne mesure pas se donnent par un officier, pour la semaine, avec un motif au journal ; ils ne
  vont à personne au reset du mercredi, comme les autres (#108).
- Princesse se calcule avec le journal de combat (soins reçus sur les boss tués en raid VXV, sur la saison) ; un
  officier peut toujours la donner pour la semaine si le journal a manqué des soins (#110).

## Vers le compagnon sans `/reload`

- Mesure T11 (#109) : le journal de combat s'écrit pendant la partie, le journal du chat seulement à la fermeture du
  jeu. Pistes écartées : captures d'écran codées, lecture des pixels ou de la mémoire du jeu.
- Pas de bouton ni de commande qui recharge l'interface.
- Le journal de combat est lu par le compagnon pendant les raids (#110).

## Ranking

- Ranking ressemble à la capture `docs/design/captures/ranking.jpg`, sur le site et dans l'addon.
- Catégories : Paris, Deathroll, Quêtes, Titres. Pas de catégorie Présence.
- Quêtes : points de places, 3 pour la 1re place d'une quête validée, 2 pour la 2e, 1 pour la 3e.
- Titres : semaines de titre détenues sur la période.
- Un officier peut ouvrir un pari depuis l'addon comme depuis le site.
