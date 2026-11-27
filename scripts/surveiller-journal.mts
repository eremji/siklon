// Surveillant du journal des lectures (#164), lancé par .github/workflows/surveillance.yml.
// Variables : SIKLON_URL (adresse du site), GITHUB_TOKEN et GITHUB_REPOSITORY (fournis par GitHub Actions).
import { issuesGitHub, lireSante, surveillerJournal } from "../src/lib/sante/surveillance";

const { SIKLON_URL, GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if (!SIKLON_URL || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error("SIKLON_URL, GITHUB_TOKEN et GITHUB_REPOSITORY sont nécessaires (variable de dépôt SIKLON_URL ?).");
  process.exit(1);
}

const etat = await lireSante(SIKLON_URL);
const action = await surveillerJournal({
  etat,
  issues: issuesGitHub({ depot: GITHUB_REPOSITORY, jeton: GITHUB_TOKEN }),
  maintenant: new Date(),
});
console.info(`Journal : ${etat} ; issue d'alerte : ${action}.`);
