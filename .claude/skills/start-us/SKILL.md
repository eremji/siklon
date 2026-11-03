---
name: start-us
description: Démarre le travail sur une user story à partir de son numéro d'issue GitHub (lecture de l'issue, branche, plan d'implémentation tests d'abord).
argument-hint: <numéro d'issue>
disable-model-invocation: true
---

# Démarrer une user story

Issue : #$ARGUMENTS

Suivre ces étapes dans l'ordre. S'arrêter et prévenir si l'une échoue.

1. **Vérifier l'argument.** Sans numéro d'issue valide, demander lequel et s'arrêter.
2. **Lire l'issue** : `gh issue view $ARGUMENTS --comments`. Vérifier qu'elle est ouverte
   et porte le label `user-story` ; sinon, le signaler et demander si on continue.
   Relire aussi la partie concernée de SPEC.md, et DESIGN.md si l'interface est touchée.
3. **Se mettre à jour sur main.** Vérifier que l'arbre de travail est propre
   (`git status --porcelain`) ; sinon, s'arrêter et demander quoi faire des changements
   en cours, sans rien jeter. Puis `git switch main` et `git pull --ff-only`.
4. **Créer la branche** `feat/<n°>-<slug>`, ou `fix/<n°>-<slug>` si l'issue décrit un bug.
   Slug tiré du titre : minuscules, sans accents, mots séparés par des tirets, 5 mots au
   plus. Si la branche existe déjà, s'y placer au lieu d'en créer une.
5. **Reformuler les critères d'acceptation** en liste numérotée, chacun sous une forme
   testable (situation → résultat attendu). Signaler tout critère ambigu ou non testable.
6. **Proposer un plan d'implémentation, tests d'abord** :
   - pour chaque critère, le ou les tests à écrire avant le code (Vitest ou Playwright,
     fichier visé) ;
   - puis les fichiers à créer ou modifier ;
   - les petites itérations prévues, une par critère si possible ;
   - les nouvelles dépendances éventuelles, signalées comme à valider.
7. **Attendre la validation du plan.** N'écrire ni test ni code avant un « oui » explicite.
