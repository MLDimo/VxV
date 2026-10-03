# Environnements et secrets

## Deux environnements

| | Test | Production |
| --- | --- | --- |
| Base | Projet Supabase `vxv-test` | Projet Supabase `vxv-prod` |
| Mise à jour de la base | Automatique à chaque fusion dans `main` qui touche `supabase/migrations` ou `data/raids` | Manuelle uniquement : flux « Deploy database », cible « production », depuis `main` |
| Site et bot (Vercel, à partir de P2) | Déploiements « Preview » des branches | Déploiement « Production » de `main` |

La base de test ne contient jamais de vraies données de membres : son mot de passe est considéré comme exposé. Elle ne reçoit que des données de raid et des données fictives.

Chaque déploiement de la base passe d'abord tous les tests. Il applique les migrations en attente, puis aligne les données de raid (`tools/deploy-database.sh`). La CI rejoue ce déploiement deux fois sur un PostgreSQL jetable à chaque demande de fusion.

Site : projet Vercel `vxv-web` (racine `apps/web`), en ligne sur https://vxv-web.vercel.app. La dernière prévisualisation est toujours accessible sur https://vxv-web-test.vercel.app. Le flux CI le déploie après les tests : une prévisualisation pour chaque demande de fusion, la production à chaque fusion dans `main`. Le déploiement automatique de Vercel depuis git est désactivé (`apps/web/vercel.json`) pour que rien ne parte sans les tests. Les prévisualisations sont protégées par Vercel (connexion à l'équipe requise). Preview utilise la base `vxv-test`, Production la base `vxv-prod`.

## Où vivent les secrets

Aucun secret dans le dépôt : `.env` et ses variantes sont ignorés par git.

| Secret | Où | Utilisé par |
| --- | --- | --- |
| `SUPABASE_TEST_DB_URL` | Secrets du dépôt GitHub | Flux « Deploy database », cible test |
| `SUPABASE_PRODUCTION_DB_URL` | Secrets du dépôt GitHub | Flux « Deploy database », cible production |
| `CF_API_KEY`, `WAGO_API_TOKEN` | Secrets du dépôt GitHub | Flux « Release addon » |
| `VERCEL_TOKEN` | Secrets du dépôt GitHub (`VERCEL_ORG_ID` et `VERCEL_PROJECT_ID` en variables) | Flux « CI », déploiement du site |
| Variables du site (liste dans `apps/web/.env.example`) | Variables d'environnement Vercel, par environnement | Site |

La clé « service role » de Supabase ne quitte jamais le serveur : ni l'addon ni le compagnon ne la reçoivent.

## Mise en place des bases Supabase (une fois)

1. Créer un compte sur supabase.com, puis deux projets : `vxv-test` et `vxv-prod`, région Europe. L'offre gratuite permet deux projets actifs. Réglages à la création :
   - **GitHub : ne pas relier le dépôt.** Les migrations sont déployées par notre flux, après les tests, avec les données de raid et le contrôle manuel de la production. L'intégration GitHub de Supabase ferait un second déploiement, sans ces garde-fous.
   - **Enable Data API : coché.** Le serveur pourra l'utiliser en P2.
   - **Automatically expose new tables : décoché.** Aucune table n'est accessible aux rôles publics ; les droits du serveur seront accordés explicitement par migration en P2.
   - **Enable automatic RLS : décoché.** La sécurité par ligne est déjà activée par les migrations et vérifiée par les tests ; un mécanisme propre à l'hébergement ferait diverger les environnements.
   - Mot de passe de la base : le conserver dans un gestionnaire de mots de passe, il entre dans la chaîne de connexion.
2. Pour chaque projet : bouton « Connect », tuile « Direct — Connection string », méthode « Session pooler » (la connexion directe passe par IPv6, que GitHub ne joint pas). Copier la chaîne au format URI et y remplacer `[YOUR-PASSWORD]`, crochets compris, par le mot de passe de la base. Un mot de passe contenant `@ # / : ? %` casse la chaîne : en régénérer un sans symbole (Project Settings, Database).
3. Enregistrer chaque chaîne dans GitHub sans l'afficher :

   ```sh
   gh secret set SUPABASE_TEST_DB_URL
   gh secret set SUPABASE_PRODUCTION_DB_URL
   ```

4. Lancer le flux « Deploy database » sur `main`, une fois avec la cible « test », puis une fois avec « production ».

Après un changement de mot de passe d'une base, remplacer son secret avec `gh secret set` et attendre quelques minutes avant de déployer : le point d'accès « Session pooler » de Supabase met un peu de temps à accepter le nouveau mot de passe (erreur `password authentication failed` en attendant).

## Mise en place du déploiement du site (une fois)

1. Créer un jeton sur vercel.com, Account Settings, Tokens, limité à l'équipe « MLDimo's projects ».
2. L'enregistrer dans GitHub sans l'afficher : `gh secret set VERCEL_TOKEN`.

## Mise en place de la connexion Discord (une fois)

1. Sur discord.com/developers, créer une application « VXV ».
2. Page OAuth2, ajouter ces adresses de redirection :
   - `https://vxv-web.vercel.app/connexion/discord/retour` (production)
   - `https://vxv-web-test.vercel.app/connexion/discord/retour` (test)
   - `http://localhost:3000/connexion/discord/retour` (développement local)
3. Identifiants non secrets (les copier en mode développeur Discord, clic droit puis « Copier l'identifiant ») : identifiant client de l'application, serveur de la guilde, rôles trésorier, officier et GM. Ils vont dans Vercel pour Preview et Production, en variables lisibles pour pouvoir les vérifier (`vercel env add DISCORD_GUILD_ID production --value <identifiant> --no-sensitive`). Tout le monde sur le serveur de la guilde est membre, sans rôle ; le GM porte un rôle « GM » (le propriétaire du serveur ne se détecte pas sans demander à chaque membre la liste de ses serveurs).
4. Secrets, à saisir sans les afficher :

   ```sh
   vercel env add DISCORD_CLIENT_SECRET production
   vercel env add DISCORD_CLIENT_SECRET preview
   vercel env add DATABASE_URL production   # Transaction pooler (port 6543) de vxv-prod
   ```

`DATABASE_URL` de Preview pointe déjà sur `vxv-test` (Transaction pooler, port 6543, adapté aux fonctions serverless).
