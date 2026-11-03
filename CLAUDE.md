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
Le projet n'est pas encore généré : mettre cette section à jour avec les
scripts réels de `package.json` dès leur création (dev, build, lint,
test, test:e2e).

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
