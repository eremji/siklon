# Siklon

Application web de suivi des cyclones tropicaux pour les Antilles.

## Données
- Temps réel : flux NHC `CurrentStorms.json` (systèmes actifs, Atlantique).
- Historique : base HURDAT2 du NHC (fichier texte, une ligne d'en-tête par
  tempête suivie de ses points de trajectoire), importée dans Postgres.
- Ne jamais présenter une donnée comme officielle sans citer sa source
  et l'heure de mise à jour NHC.

## Stack
- Next.js (App Router) + TypeScript en mode strict
- Postgres
- Vitest pour les tests unitaires et d'intégration
- Playwright pour les tests end-to-end
- Déploiement sur Vercel

## Commandes
- `npm run dev` : serveur de développement (http://localhost:3000).
- `npm run lint` · `npm run typecheck` · `npm test` (Vitest) · `npm run test:e2e` (Playwright).
- `npm run build` puis `npm run start` : version de production en local.
- Tests e2e : installer le navigateur une fois avec `npx playwright install chromium`.
- Next.js 16 : lire la doc de `node_modules/next/dist/docs/` avant d'utiliser une API (voir AGENTS.md).

## Règles de travail
- Toujours répondre en français.
- Avancer par petites itérations : un changement ciblé à la fois.
- Écrire les tests avant le code (TDD) : test qui échoue, puis code
  minimal pour le faire passer, puis refactorisation.
- Ne jamais committer si un test échoue : lancer la suite complète
  (Vitest, et Playwright si l'interface est touchée) avant chaque commit.
- Demander avant d'ajouter une dépendance (npm ou autre) : expliquer
  à quoi elle sert et pourquoi l'existant ne suffit pas.

## Conventions
- Secrets et URL de base de données uniquement dans `.env.local`
  (ignoré par git) et dans les variables d'environnement Vercel.
- Tester le parsing NHC/HURDAT2 avec des fixtures locales, jamais
  en appelant le réseau dans les tests.
- Rayons, îles et flux Météo-France : utiliser les constantes de la
  section « Constantes et référentiels » de SPEC.md
  (`RADIUS_IMPACT_KM`, `RADIUS_WATCH_KM`), jamais de valeur en dur.
- Interface : suivre DESIGN.md (jetons de couleur clair/sombre, typo,
  règles des couleurs de vigilance) ; aucune couleur hors jetons.

## Workflow
- 1 user story = 1 issue (template « User story ») ; pas de code sans issue.
- Branche depuis `main` : `feat/<n°>-<slug>` ou `fix/<n°>-<slug>` (ex. `feat/3-delai-avant-passage`).
- Commits en Conventional Commits, en français : `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:` (vérifié par commitlint).
- Chaque PR contient « Closes #<n°> » et suit le template de PR.
- Jamais de commit direct sur `main` ; jamais de merge si la CI est rouge.
- Procédures détaillées : `/start-us <n°>` pour démarrer une US, `/ship` pour livrer.
