// Importe un fichier HURDAT2 du NHC dans la base : npm run import:hurdat2 -- <hurdat2-….txt>
// (.mts : module ES explicite pour Node, qui exécute le TypeScript sans compilation)
// La connexion vient de DATABASE_URL (.env.local en local). Tout ou rien, en une transaction.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import pg from "pg";
import { remplacerHistorique } from "../src/lib/db/historique";
import { preparerImport } from "../src/lib/hurdat2/import";

const chemin = process.argv[2];
if (!chemin) {
  console.error("Usage : npm run import:hurdat2 -- <hurdat2-AAAA-AAAA-MMJJAA.txt>");
  process.exit(1);
}

const resultat = preparerImport(readFileSync(chemin, "utf8"), basename(chemin));
if (!resultat.ok) {
  for (const erreur of resultat.erreurs.slice(0, 50)) console.error(erreur);
  console.error(`${resultat.erreurs.length} erreur(s) : import annulé, la base n'a pas été modifiée.`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL manquante (à définir dans .env.local).");
  process.exit(1);
}

const { donnees } = resultat;
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await remplacerHistorique(client, donnees);
  console.log(
    `Import terminé : ${donnees.tempetes.length} tempêtes, ${donnees.passages.length} passages près des îles, ` +
      `version NHC du ${donnees.versionNhc}.`,
  );
} finally {
  await client.end();
}
