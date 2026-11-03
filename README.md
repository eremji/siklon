# Siklon

Application web de suivi des cyclones tropicaux pour les Antilles : carte des
systèmes actifs de l'Atlantique, délai estimé avant le passage près de son
île, vigilance officielle en cours, alertes, liste de préparation et
historique des cyclones passés.

> Siklon ne remplace pas les consignes officielles. Suivez les autorités
> locales.

## État du projet

Le projet est en phase de cadrage : la spécification, le design et les user
stories sont prêts, le code de l'application n'est pas encore écrit.

- [SPEC.md](SPEC.md) : périmètre de la V1, user stories et critères
  d'acceptation, constantes (rayons, îles de référence).
- [DESIGN.md](DESIGN.md) : direction visuelle, jetons de couleur clair et
  sombre, typographie, règles d'accessibilité.
- [Issues](https://github.com/eremji/siklon/issues?q=label%3A%22user+story%22) :
  une issue par user story, avec ses critères en cases à cocher.

## Sources de données

- [National Hurricane Center](https://www.nhc.noaa.gov/) (NOAA) : systèmes
  actifs (`CurrentStorms.json`), avis et prévisions de trajectoire.
- [HURDAT2](https://www.nhc.noaa.gov/data/#hurdat) : historique des cyclones
  de l'Atlantique depuis 1851.
- [Météo-France](https://portail-api.meteofrance.fr/) : vigilance cyclonique
  de la Guadeloupe, de la Martinique, de Saint-Martin et de Saint-Barthélemy.

## Stack

- [Next.js](https://nextjs.org/) et TypeScript
- PostgreSQL
- [Better Auth](https://www.better-auth.com/) : connexion Google ou email et
  mot de passe
- [Brevo](https://www.brevo.com/) : envoi des emails ; web push pour les
  alertes
- [Vitest](https://vitest.dev/) et [Playwright](https://playwright.dev/) pour
  les tests
- Déploiement sur [Vercel](https://vercel.com/)

## Lancer le projet en local

> Ces étapes s'appliqueront une fois l'application Next.js générée. Les
> scripts exacts seront ceux de `package.json`.

Prérequis : Node.js 20 ou plus récent, PostgreSQL, git.

```bash
git clone https://github.com/eremji/siklon.git
cd siklon
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev                  # http://localhost:3000
```

Tests :

```bash
npm test           # tests unitaires et d'intégration (Vitest)
npm run test:e2e   # tests de bout en bout (Playwright)
```

### Variables d'environnement

Les secrets ne sont jamais committés : ils vont dans `.env.local` (ignoré par
git) en local, et dans les variables d'environnement Vercel en production.
`.env.example` listera toutes les variables attendues, sans leurs valeurs,
notamment :

| Variable | Usage |
|---|---|
| `DATABASE_URL` | Connexion à PostgreSQL |
| `METEOFRANCE_API_KEY` | API Vigilance de Météo-France (clé gratuite) |
| `BREVO_API_KEY` | Envoi des emails |

## Contribuer

Les règles de travail sont décrites dans [CLAUDE.md](CLAUDE.md) : petites
itérations, tests écrits avant le code, aucun commit si un test échoue.

## Licence

[MIT](LICENSE)
