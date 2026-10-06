# Décisions du 6 octobre 2026

Complète le plan de développement v1.0 et les décisions des 3 et 5 octobre. Le propriétaire a confié la P11
(paris) puis la P12 (missions) en autonomie : les choix ci-dessous précisent le plan là où il ne tranche pas, et
restent ouverts à sa relecture.

## P11 : paris

- Montants en pièces d'or entières (po), partout : mises, gains, caisse. Mise d'au moins 1 po, sans maximum.
- Une seule mise par membre et par pari, sur un seul choix ; modifiable (choix et montant) ou retirable jusqu'à
  la fermeture, tant que le trésorier ne l'a pas notée payée. Payée, elle ne change plus.
- Un pari propose de 2 à 10 choix (lisible sur Discord), avec une heure de fermeture ; ouvert par un officier,
  avec un motif inscrit au journal, comme toute action d'officier.
- Cotes : la part de l'organisation (10 % de la cagnotte) ne dépasse jamais les mises perdantes. Ainsi un gagnant
  ne perd jamais d'or, et les deux cas du plan en découlent : personne sur le gagnant, tout va à l'organisation ;
  tout le monde sur le gagnant, chacun récupère sa mise.
- Gain d'un gagnant : sa part du reste, au prorata de sa mise, arrondie à la pièce d'or inférieure ; ce que
  l'arrondi laisse va à la caisse de la guilde avec la part de l'organisation.
- Les membres sont montrés par leur personnage principal, dans sa couleur de classe, sinon par leur nom Discord :
  parier ne demande pas d'avoir lié un personnage.
- Discord : le message de chaque pari (cagnotte, part et cote de chaque choix) est mis à jour à chaque mise, avec
  deux boutons, « Miser » (formulaire : choix et montant, prérempli) et « Retirer ma mise ». Les paris sont publiés
  dans le salon `DISCORD_BETS_CHANNEL_ID` s'il est défini, sinon dans le salon des raids.
- Site : la section « Le Dé Pipé » (`/paris`) montre les paris ouverts sur la table de jeu, puis les fermés ; chaque
  pari a sa page avec toutes les mises (paris transparents).
- Résultat : un officier déclare le choix gagnant, ou annule le pari (chaque mise est rendue), avec un motif au
  journal ; cela termine le pari, même avant son heure de fermeture. La part de l'organisation entre dans la caisse
  au résultat (une dette jamais réglée se corrigerait par une dépense).
- Trésorerie : seul le rôle trésorier valide l'or qui change de mains en jeu (décision du 3 octobre) : mise reçue
  (ou dette réglée), gain ou remboursement versé. Une mise gagnante non payée est déduite de son gain ; une mise
  perdue non payée devient une dette, qui empêche de parier jusqu'à son règlement. Chaque validation est visible de
  tous (page « Trésorerie » du Dé Pipé, `/paris/tresorerie`).
- Caisse de la guilde : solde, entrées et sorties du mois, et chaque mouvement avec son motif, sur la page gauche du
  Journal. Le trésorier inscrit les dons (avec leur donateur, pour le titre « Sugar Daddy » de la P13), les dépenses
  et les récompenses ; aucun mouvement ne se modifie ni ne s'efface : une erreur se corrige par un autre mouvement.
- Classement des parieurs (Ranking, `/ranking`) : gain net (gains moins mises), total gagné, nombre de paris et
  taux de réussite, sur les paris terminés dans la période (depuis toujours, ce mois, la saison) ; les paris annulés
  ne comptent pas. À gain net égal, le plus gros total gagné passe devant. La dette d'un parieur s'affiche à côté de
  son nom, quelle que soit la période.
- Saisons : un officier lance la suivante avec un motif au journal ; seule la période « Saison » repart de zéro. Avant
  la première saison, ce classement est vide.
- Avatars : portraits de la charte (§8) choisis par race, classe et sexe du personnage principal, avec le repli prévu
  (même race et classe, puis même classe, puis même race) ; les neuf portraits livrés couvrent les neuf classes.
