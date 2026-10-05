# Décisions du 5 octobre 2026

Complète le plan de développement v1.0 et les décisions du 3 octobre.

## Design : la charte « La Taverne »

- Référence validée : `docs/design/VXV_Design_Spec.md`, avec les captures (rendu attendu) et les maquettes HTML
  (valeurs CSS de référence ; leur petit moteur de modèles n'est pas repris).
- Intégration par une phase « Habillage », **avant la P7** :
  1. socle commun : jetons, polices, images ;
  2. site ;
  3. mesure en jeu des polices et des textures ;
  4. addon.
- Les jetons vivent dans `packages/design`, seule source des couleurs et des polices du site, du compagnon et
  de l'addon (thème Lua généré).
- Le site reste **entièrement réservé aux membres** : un visiteur ne voit que la page de connexion, dans la charte,
  sans données.
- Survol d'un lieu de la taverne : halo améthyste seul, sans contour or (site et addon) ; la plaque passe toujours en
  prune.
- Les lieux des phases suivantes (Le Dé Pipé, Quêtes, Ranking, Artisans) peuvent être préparés dès l'habillage :
  l'addon n'est ouvert à la guilde qu'une fois toutes les phases terminées. Le mur des avis de recherche (JcJ)
  reste sans interaction.
- Noms de joueurs dans d'autres alphabets (cyrillique, chinois, coréen, présents dans la guilde de la bêta) :
  nos polices n'ont pas les caractères chinois et coréens ; l'addon passe par les polices du jeu pour ces
  alphabets (à mesurer en jeu).
- Avatars : le jeu ne donne la race et le sexe d'un autre joueur que dans le groupe, et la liste de guilde ne les
  contient pas. Avatar par classe en attendant que l'addon de chaque joueur transmette la race et le sexe de ses
  personnages (P7).

## Addon

- Ouvert à la guilde seulement quand toutes les phases sont terminées.

## P7 : application compagnon

- Electron, pour Windows et Mac.
- Versions publiées dans un dépôt public dédié : le dépôt du code reste privé, et les mises à jour automatiques
  doivent pouvoir être téléchargées par tous.
- Pas de signature au départ (avertissement au premier lancement sous Windows, « Ouvrir » par clic droit sur Mac).

## Deathroll (P15)

- Les rolls vont de 0 à X, et le joueur qui fait 0 perd (pas de 1 à X). La P0 a déjà lu correctement un roll 0-1.
