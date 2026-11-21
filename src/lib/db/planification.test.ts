// @vitest-environment node
// Planification des alertes (US-07) : la migration n'agit que sur Supabase, où pg_cron et pg_net
// existent. Ailleurs (PGlite, base de CI, siklon_e2e), elle ne fait rien et ne bloque pas les migrations.
import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";

const DEMARRAGE_PGLITE_MS = 30_000;
const MIGRATION = readFileSync(
  join(import.meta.dirname, "../../../supabase/migrations/20261121000000_planification_alertes.sql"),
  "utf8",
);

let db: PGlite;

beforeAll(async () => {
  db = await baseMigree();
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

describe("planification des alertes", () => {
  it("sans pg_cron, les migrations passent sans rien planifier", async () => {
    const { rows } = await db.query<{ cron: string | null; net: string | null }>(
      "select to_regnamespace('cron')::text as cron, to_regnamespace('net')::text as net",
    );
    expect(rows).toEqual([{ cron: null, net: null }]);
  });

  it("peut être rejouée sans erreur", async () => {
    await expect(db.exec(MIGRATION)).resolves.toBeDefined();
  });

  it("appelle la route chaque minute avec l'adresse et le secret du Vault, jamais écrits dans le dépôt", () => {
    expect(MIGRATION).toMatch(/cron\.schedule\(\s*'siklon-verifier-alertes',\s*'\* \* \* \* \*'/);
    expect(MIGRATION).toContain("vault.decrypted_secrets where name = 'siklon_alertes_url'");
    expect(MIGRATION).toContain("vault.decrypted_secrets where name = 'siklon_alertes_secret'");
    expect(MIGRATION).not.toMatch(/https:\/\//);
  });
});
