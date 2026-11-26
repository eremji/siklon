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
- Prévisualisation dans l'app Claude : configurations `siklon` et `siklon-demo`
  (fixtures NHC locales, `NHC_FIXTURES=1`) dans `.claude/launch.json`.

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
- Langues (US-10) : pages sous `src/app/[langue]/` (`/fr/…`, `/en/…`), `src/proxy.ts`
  redirige les adresses sans langue. Liens internes avec `<Lien href="/iles">`
  (`components/langue/Lien.tsx`), jamais `next/link` en direct ; un formulaire dont la
  server action redirige porte `<ChampLangueInterface />`.

## Workflow
- 1 user story = 1 issue (template « User story ») ; pas de code sans issue.
- Branche depuis `main` : `feat/<n°>-<slug>` ou `fix/<n°>-<slug>` (ex. `feat/3-delai-avant-passage`).
- Commits en Conventional Commits, en français : `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:` (vérifié par commitlint).
- Chaque PR contient « Closes #<n°> » et suit le template de PR.
- Jamais de commit direct sur `main` ; jamais de merge si la CI est rouge.
- Procédures détaillées : `/start-us <n°>` pour démarrer une US, `/ship` pour livrer.

## Vérification locale
- Tests e2e : base Postgres locale jetable `siklon_e2e` (Postgres 17 Homebrew,
  migrations + fixture HURDAT2 importée), jamais la base de `.env.local` :
  `DATABASE_URL=postgresql://localhost:5432/siklon_e2e npm run test:e2e`.
  Après une nouvelle migration, l'appliquer aussi à `siklon_e2e`
  (`/opt/homebrew/opt/postgresql@17/bin/psql -h localhost siklon_e2e -f <fichier>`).
- Ports 3000 et 3100 souvent occupés par d'autres sessions : ne jamais tuer
  ces serveurs ; lancer les e2e sur un port libre (`npm run start -- -p <port>`
  avec une config Playwright temporaire hors du dépôt qui change `baseURL` et `webServer`).
- Dans un worktree (`.claude/worktrees/…`) : `npm ci` avant `npm run build` ou les e2e,
  sinon Turbopack échoue sur « Module not found » alors que Vitest passe.
- Next.js 16 garde la page précédente cachée dans le DOM : en e2e, filtrer
  `{ visible: true }` ; pas de `useId` pour un champ présent sur deux pages.
- Captures d'une PR : les mettre en commentaire de la PR, pas seulement dans le chat.
  `gh` ne téléverse pas d'image : pousser les PNG par un commit orphelin sur une branche
  `captures/us-<n°>` (jamais mergée, ignorée par Vercel) et les citer par
  `https://raw.githubusercontent.com/eremji/siklon/captures/us-<n°>/<fichier>.png`.
- Le hook `guard-bash.sh` bloque toute commande contenant à la fois `git push` et le mot
  `main` : faire `git push` et `gh pr create` en deux commandes.

## Économie de jetons
Chaque étape d'une session relit tout son historique : plus la session est longue,
plus chaque action coûte. Garder les sessions courtes et les sorties brèves.

- Tests pendant le développement : seulement le fichier concerné,
  `npm test -- <fichier>` et `npm run test:e2e -- <fichier> --project=mobile --reporter=line`.
  La suite complète (Vitest, puis Playwright sur les deux projets) une seule fois,
  juste avant le commit, avec une sortie courte :
  `npm test 2>&1 | tail -15` et `npm run test:e2e -- --reporter=dot 2>&1 | tail -40`.
  En cas d'échec, relancer seulement le test en échec, pas toute la suite.
- Toute commande longue (build, install, logs CI) : n'afficher que la fin ou les
  erreurs (`| tail`, `| grep`), jamais la sortie entière.
- Une session par livraison : une fois la PR d'une livraison ouverte avec la CI verte,
  écrire la note de passation, puis arrêter. La livraison suivante démarre dans une
  session neuve (l'utilisateur archive l'ancienne).
- Note de passation : un commentaire sur l'issue de l'US, qui commence par
  `## Passation`, publié avec `gh issue comment <n°> --body-file <fichier>` (accessible
  depuis tous les worktrees). Un nouveau commentaire à chaque livraison, complet à lui
  seul : le dernier fait foi. 40 lignes au plus, sans recopier l'issue ni le code :
  1. État : PR fusionnées et ouvertes, branche, livraisons restantes ;
  2. Décisions de l'utilisateur (avec la date) ;
  3. Pièges et faits non évidents rencontrés ;
  4. Prochaine étape : critères restants et premier test à écrire ;
  5. Déjà vérifié, à ne pas refaire.
  Aucun secret ni donnée personnelle : le commentaire est public.
  Une session qui reprend une US lit la dernière passation et l'issue, puis commence ;
  elle ne relit pas les anciennes conversations et ne réexplore pas ce que la note établit.
- Modèle des sessions lancées : Sonnet (`claude-sonnet-5-5`) pour les tâches
  mécaniques (mise à jour Dependabot, conflit ou rebase, test instable, captures,
  modification de documentation) ; Opus pour concevoir et développer une US.
