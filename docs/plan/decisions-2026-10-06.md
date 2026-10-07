# Décisions du 6 octobre 2026

Complète le plan de développement v1.0 et les décisions des 3 et 5 octobre. Le propriétaire a confié la P11
(paris), la P12 (missions), la P13 (titres), puis la P14 (artisans) et la P15 (deathroll) en autonomie : les choix ci-dessous précisent le plan là où il ne tranche pas, et
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
- En jeu (11.8) : le bundle `VXV_Paris` montre les paris ouverts avec leurs cotes, la mise du joueur, ses paris, le
  classement depuis toujours et la caisse ; une mise faite en jeu attend le site, comme les inscriptions (P7.5),
  et passe par le compagnon du joueur ou d'un officier. La caisse s'affiche aussi sur la page gauche du Journal.
  Pour recevoir les données des paris, les membres équipés du compagnon doivent passer à sa version 1.1.

## P12 : missions

- Types : pêche, herboristerie, minage, dépeçage (nombre de récoltes) et victoires honorables ; la mission « monstres
  gris » reste abandonnée (décision du 3 octobre). Durée d'une semaine par défaut, un mois au plus ; titre par défaut
  selon le type (« Le Grand Pêcheur »…).
- Score d'un membre : ce que le compteur du jeu de chacun de ses personnages liés (main et rerolls) a gagné pendant
  la mission, depuis son dernier relevé avant le début, sinon depuis son premier relevé pendant la mission. À égalité,
  le premier à atteindre le score (heure du relevé) passe devant.
- Relevés : l'addon lit les compteurs et les garde pour le compagnon, qui les envoie au site ; un officier équipé
  relaie ceux des membres sans compagnon. Le site n'accepte d'un membre que les relevés de ses propres personnages.
- Résultat : validé par un officier une fois la mission finie (journal). Les trois premiers reçoivent 70 %, 20 % et
  10 % de la récompense, arrondis à la po inférieure ; une place sans joueur garde sa part dans la caisse. Le
  trésorier note chaque récompense versée : elle sort de la caisse, avec sa mission.
- Hall of fame : missions gagnées, gains, position moyenne sur les missions où le joueur a au moins un point.
- Discord : `/vxv_mission` (officiers) publie une mission qui commence aussitôt ; son message, avec le classement, suit
  les relevés. Salon `DISCORD_MISSIONS_CHANNEL_ID` s'il est défini, sinon celui des raids.
- En jeu (12.3, 12.5, 12.8) : le bundle `VXV_Missions` lit les compteurs à la connexion puis chaque minute, hors combat
  (les statistiques sont illisibles en combat), garde chaque changement pour le compagnon et le dit à la guilde : un
  officier équipé le relaie pour un membre sans compagnon, et chacun voit les scores en direct. Les victoires
  honorables sont lues dès maintenant ; les statistiques de pêche et de récolte le seront une fois leurs identifiants
  mesurés sur Forever.
- Compteurs mesurés le 6 octobre (sonde, `/vxvtest counters list`) : la pêche est la statistique 1456 « Poissons et
  autres objets pêchés » ; les victoires honorables viennent de `GetPVPLifetimeStats`. Le jeu ne compte pas les
  récoltes sur Forever (seulement le plus haut niveau de compétence). **Décision du propriétaire** : les missions
  d'herboristerie, de minage et de dépeçage restent, comptées par l'addon : une fenêtre de butin qui contient une
  herbe, un minerai (ou une pierre) ou un cuir compte pour une récolte, quel que soit le nombre d'objets. Seules les
  récoltes faites addon actif comptent.

## P13 : titres

- Chaque titre va au membre en tête sur sa règle, calculée sur la saison en cours (depuis toujours sans saison). À
  égalité, le premier à atteindre le score le garde. Un titre sans aucun score positif ne va à personne.
- Titres calculés sur les données déjà en base : Roi du gambling (plus gros gain net aux paris), Roi de la dette (plus
  grosse perte nette), Numéro UNO (vainqueur de la dernière mission validée), Bien gras (le plus d'objets reçus en
  raid), Goûteur de sol (le plus de morts dans les journaux de raid VXV), Sugar Daddy (plus gros donateur à la caisse).
  Les paris annulés ne comptent pas.
- Réattribution chaque mercredi à 5 h UTC, après le reset (tâche Vercel `/api/cron/titres`), une seule fois par
  semaine ; l'historique de chaque semaine reste en base et le site en montre huit (Ranking, catégorie « Titres »).
- Discord : chaque titre est un rôle « ◆ <titre> », créé par le bot s'il manque, retiré à l'ancien détenteur et donné
  au nouveau ; les titres de la semaine sont annoncés dans `DISCORD_TITLES_CHANNEL_ID` s'il est défini, sinon le salon
  des raids. Le rôle du bot doit être placé au-dessus de ces rôles dans les réglages du serveur.
- Titres de raid (journal `VXV-LOG-2`) : Chibrax au max (dégâts) et Remboursé par la Sécu (soins) additionnent le
  compteur du jeu de chaque boss tué, lu par l'addon de chaque membre une fois sorti du combat (les montants sont
  secrets pendant) ; les joueurs hors du groupe ne comptent pas. Lève toi copaing compte les résurrections acceptées
  (le joueur relevé, comme le dit le plan) : une offre du jeu suivie du retour à la vie dans la minute ; un retour par
  le cadavre ne compte pas. Les journaux `VXV-LOG-1` des addons pas encore mis à jour restent lus, sans ces lignes.
- En jeu (13.3, 13.4) : les titres de la semaine viennent du site comme les paris et les missions (compagnon, puis
  relais d'un officier), avec leurs noms et leurs règles : un titre ajouté côté site s'affiche sans mise à jour de
  l'addon (13.6). Ils sont visibles dans le Ranking de l'addon, dans l'infobulle d'un membre (une ligne par titre),
  avant ses messages dans le canal de guilde et après son nom dans la liste de guilde (tous ses titres, sur tous ses
  personnages). Seuls les joueurs équipés de l'addon les voient.
- Princesse (soins reçus) est abandonné : le compteur du jeu ne mesure pas les soins reçus sur Forever (11 types
  mesurés le 3 octobre, aucun pour les soins reçus). Il cheat c'est sûr et Loser attendent le deathroll (P15).
- Mise à jour du 7 octobre (décision du propriétaire) : Princesse revient comme titre donné par un officier. Les
  titres que le jeu ne mesure pas (`OFFICER_TITLES` de `domain/titles.ts`) se donnent sur Ranking › Titres, pour la
  semaine affichée, avec un motif inscrit au journal ; le rôle Discord suit aussitôt. Comme les autres, ils ne vont à
  personne à la réattribution du mercredi.

## P14 : artisans

- Relevé (mesuré en phase 0, T10) : le niveau de chaque métier à chaque connexion (`GetProfessions`), les recettes
  apprises à l'ouverture de la fenêtre du métier (`C_TradeSkillUI`), pour chaque personnage du compte (main et
  rerolls). Une lecture remplace une lecture plus ancienne du même personnage et du même métier ; un niveau relu
  sans ses recettes garde les recettes connues.
- Site : un membre envoie les métiers de ses personnages, un officier aussi ceux qu'il a entendus en jeu (comme les
  compteurs des missions). Recherche « Qui peut fabriquer… ? » sur le nom des recettes tel que le jeu l'écrit (le
  nom de l'objet fabriqué, en général), sans accents ni casse, tous les mots cherchés ; au plus 30 recettes.
  Annuaire par métier, du plus haut niveau au plus bas, avec la date de la dernière lecture.
- Le compagnon 1.3 envoie les textes de tout bundle sans les connaître ; le site répond avec ses messages en liste
  (`texts`), affichés tels quels : les métiers, puis le deathroll, ne demandent plus de nouvelle version.
- En jeu (14.1, 14.4) : seuls les métiers du joueur sont relevés, et au niveau que dit sa liste de métiers (une
  fenêtre de métier ouverte par le lien d'un autre joueur est ignorée). Les recettes relues identiques ne repartent
  pas. Partage : chaque addon dit ses métiers à la guilde quand ils changent ; à la connexion, il dit la liste de
  ce qu'il a (personnage, métier, dates) et demande celle des autres ; il chuchote à leur propriétaire les demandes
  de ce qui lui manque. L'annuaire du site arrive par le compagnon seulement : relayé par les officiers, il
  occuperait le canal plusieurs minutes. Un officier équipé du compagnon envoie au site les métiers qu'il entend.

## P15 : deathroll

- Une partie n'arrive au site qu'une fois finie, par le compagnon d'un de ses joueurs ou relayée par un officier ; le
  site vérifie ses règles (deux joueurs liés à des membres, le défié roll le premier, chacun de 1 au résultat
  précédent, fin au premier 1) et la garde une seule fois.
- Paris (15.2) : les mises placées en jeu pendant la minute qui précède le premier roll arrivent avec la partie ; le
  site crée alors un pari « Deathroll : A vs B » et le règle aussitôt avec les règles des paris (part de la caisse,
  gains, mises à payer au trésorier). Une mise d'un joueur de la partie, d'un membre endetté ou sur un autre joueur
  est écartée ; une mise invalide n'annule pas la partie.
- Dette (15.6) : la mise du perdant est due au gagnant jusqu'à ce que celui-ci confirme le paiement, sur le site ou
  en jeu (la partie repart vers le site avec sa confirmation, ligne `Y`). Toute dette (paris ou deathroll) bloque
  les paris et les deathrolls.
- Discord (15.5) : une partie à 1 000 po ou plus est annoncée dans le salon des paris quand elle arrive au site
  (après la partie : le compagnon la remonte au /reload ou à la déconnexion).
- Classement (15.7) : gain net, parties jouées, plus grosse victoire ; depuis toujours, ce mois, la saison. Titres
  « Il cheat c'est sûr » (plus gros gain net de la saison) et « Loser » (plus grosse perte nette).
- En jeu : le défi se chuchote à un membre connecté avec VXV et dure une minute ; le défié l'accepte ou le refuse
  dans une fenêtre (refus automatique s'il a une dette). L'acceptation lance la partie chez toute la guilde
  connectée et l'écrit dans le canal de guilde ; les paris restent ouverts une minute, puis le défié roll. Chaque
  roll est le /roll du jeu, tiré par le serveur et visible dans le chat ; l'addon du joueur lit son résultat et le
  dit à la guilde, qui n'accepte que le roll attendu (bon joueur, bonne plage). Pas de forfait : une partie
  abandonnée reste en cours dans l'addon jusqu'au /reload, sans dette.
- Le Dé Pipé porte deux sous-onglets, « Paris » et « Deathroll » : le socle accepte désormais plusieurs modules par
  lieu, sans que les bundles dépendent l'un de l'autre.

