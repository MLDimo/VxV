# Environnements et secrets

## Deux environnements

| | Test | Production |
| --- | --- | --- |
| Base | Projet Supabase `vxv-test` | Projet Supabase `vxv-prod` |
| Mise à jour de la base | Automatique à chaque fusion dans `main` qui touche `supabase/migrations` ou `data/raids` | Manuelle uniquement : flux « Deploy database », cible « production », depuis `main` |
| Site et bot (Vercel, à partir de P2) | Déploiements « Preview » des branches | Déploiement « Production » de `main` |

Chaque déploiement de la base passe d'abord tous les tests. Il applique les migrations en attente, puis aligne les données de raid (`tools/deploy-database.sh`). La CI rejoue ce déploiement deux fois sur un PostgreSQL jetable à chaque demande de fusion.

Vercel fournit déjà les environnements Preview et Production pour chaque projet. Les projets Vercel seront créés avec leur application (site en P2, bot en P3), reliés à `vxv-test` pour Preview et à `vxv-prod` pour Production.

## Où vivent les secrets

Aucun secret dans le dépôt : `.env` et ses variantes sont ignorés par git.

| Secret | Où | Utilisé par |
| --- | --- | --- |
| `SUPABASE_TEST_DB_URL` | Secrets du dépôt GitHub | Flux « Deploy database », cible test |
| `SUPABASE_PRODUCTION_DB_URL` | Secrets du dépôt GitHub | Flux « Deploy database », cible production |
| `CF_API_KEY`, `WAGO_API_TOKEN` | Secrets du dépôt GitHub | Flux « Release addon » |
| Clés Supabase et Discord des applications | Variables d'environnement Vercel, par environnement | Site et bot (P2, P3) |

La clé « service role » de Supabase ne quitte jamais le serveur : ni l'addon ni le compagnon ne la reçoivent.

## Mise en place des bases Supabase (une fois)

1. Créer un compte sur supabase.com, puis deux projets : `vxv-test` et `vxv-prod`, région Europe. L'offre gratuite permet deux projets actifs. Réglages à la création :
   - **GitHub : ne pas relier le dépôt.** Les migrations sont déployées par notre flux, après les tests, avec les données de raid et le contrôle manuel de la production. L'intégration GitHub de Supabase ferait un second déploiement, sans ces garde-fous.
   - **Enable Data API : coché.** Le serveur pourra l'utiliser en P2.
   - **Automatically expose new tables : décoché.** Aucune table n'est accessible aux rôles publics ; les droits du serveur seront accordés explicitement par migration en P2.
   - **Enable automatic RLS : décoché.** La sécurité par ligne est déjà activée par les migrations et vérifiée par les tests ; un mécanisme propre à l'hébergement ferait diverger les environnements.
   - Mot de passe de la base : le conserver dans un gestionnaire de mots de passe, il entre dans la chaîne de connexion.
2. Pour chaque projet : bouton « Connect », onglet « Session pooler ». Copier la chaîne de connexion, qui fonctionne en IPv4 comme l'exige GitHub, et y remplacer `[YOUR-PASSWORD]` par le mot de passe de la base.
3. Enregistrer chaque chaîne dans GitHub sans l'afficher :

   ```sh
   gh secret set SUPABASE_TEST_DB_URL
   gh secret set SUPABASE_PRODUCTION_DB_URL
   ```

4. Lancer le flux « Deploy database » sur `main`, une fois avec la cible « test », puis une fois avec « production ».
