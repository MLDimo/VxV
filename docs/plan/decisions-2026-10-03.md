# Décisions validées le 3 octobre 2026

Complète le plan de développement v1.0 du 3 octobre (16 phases) et l'aperçu des fonctionnalités.
Source : document « VXV — Ajouts au plan » et réponses du propriétaire.

## SR et SR+

- Les SR valent pour un seul événement. Leur nombre est fixé à la création et ne change plus ensuite.
- Le SR+ est attaché au personnage, et calculé à partir de l'historique (aucune table stockée).
- Règle, pour un personnage et un objet qu'il réserve à l'événement en cours :
  - on remonte ses événements précédents, du plus récent au plus ancien ;
  - absent, ou événement sans le raid qui donne l'objet : neutre, on passe au suivant ;
  - présent, objet réservé et non obtenu : +10 ;
  - objet obtenu, ou présent sans avoir réservé l'objet : on s'arrête ;
  - plafond +50 ; le bonus ne vaut que si l'objet est de nouveau réservé.
- Modèle et affichage en P2 ; le bonus vaut 0 tant que la P6 n'enregistre ni présences ni loots.
  La P6 enregistre ces données et applique le bonus aux rolls.

## Historique des loots

- Tous les loots sont enregistrés avec leur mode d'attribution : SR, SR+, roll libre, loot council.
- « SR uniquement » est un filtre d'affichage.

## Droits

- Les rôles sont cumulables : un officier peut aussi être trésorier.
- Seul le rôle trésorier donne les droits de trésorerie ; le GM ne les a pas d'office.

## Modèle de données

- Ajoutées en P2 : rôles cumulables, mode d'attribution des loots, présence au raid.
- Les autres entités sont créées avec leur phase : caisse, dons et dettes communes (P11), missions (P12),
  titres (P13), artisans (P14), deathroll (P15), demandes d'invitation si elles doivent être stockées (P5).

## Phase 0 : tests complémentaires

T1 invitations et passage en raid, T2 butin du maître du butin, T3 lecture des `/roll`, T4 messages dans le canal raid,
T5 roll par un bouton, T6 morts et résurrections, T7 compteur de dégâts et de soins, T8 compteurs du jeu,
T9 affichage (infobulles, liste de guilde, canal de guilde), T10 recettes de métier.
Si T7 échoue, les titres de dégâts et de soins sont abandonnés.
La mission « tuer des monstres gris » est abandonnée (décision du 3 octobre) : T8 vérifie seulement que les statistiques du jeu sont lisibles.
