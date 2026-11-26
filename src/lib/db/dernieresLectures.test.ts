// @vitest-environment node
// Dernière lecture réussie de chaque source (US-11), sur la base migrée : écrite par la vérification de
// chaque minute (siklon_comptes), relue par les pages quand la source ne répond plus (siklon_lecture).
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";
import { enregistrerLecture, lireDerniereLecture } from "./dernieresLectures";

const DEMARRAGE_PGLITE_MS = 30_000;

let db: PGlite;

beforeAll(async () => {
  db = await baseMigree();
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

const enTantQue = async <T>(role: string, action: () => Promise<T>): Promise<T> => {
  await db.exec(`set role ${role}`);
  try {
    return await action();
  } finally {
    await db.exec("reset role");
  }
};

const FLUX = { activeStorms: [{ id: "al112026", name: "Kyle" }] };

describe("dernière lecture réussie d'une source", () => {
  it("n'existe pas tant qu'aucune lecture n'a réussi", async () => {
    expect(await enTantQue("siklon_lecture", () => lireDerniereLecture(db, "nhc-systemes"))).toBeNull();
  });

  it("est écrite par la vérification et relue par le site, avec son heure de lecture", async () => {
    await enTantQue("siklon_comptes", () => enregistrerLecture(db, "nhc-systemes", FLUX, "2026-09-10T15:00:00.000Z"));

    expect(await enTantQue("siklon_lecture", () => lireDerniereLecture(db, "nhc-systemes"))).toEqual({
      contenu: FLUX,
      luLe: "2026-09-10T15:00:00.000Z",
    });
  });

  it("est remplacée par une lecture plus récente", async () => {
    const recent = { activeStorms: [] };
    await enTantQue("siklon_comptes", () => enregistrerLecture(db, "nhc-systemes", recent, "2026-09-10T15:01:00.000Z"));

    expect(await enTantQue("siklon_lecture", () => lireDerniereLecture(db, "nhc-systemes"))).toEqual({
      contenu: recent,
      luLe: "2026-09-10T15:01:00.000Z",
    });
  });

  it("n'est jamais remplacée par une lecture plus ancienne (deux vérifications simultanées)", async () => {
    await enTantQue("siklon_comptes", () => enregistrerLecture(db, "nhc-systemes", FLUX, "2026-09-10T14:00:00.000Z"));

    expect((await enTantQue("siklon_lecture", () => lireDerniereLecture(db, "nhc-systemes")))?.luLe).toBe(
      "2026-09-10T15:01:00.000Z",
    );
  });

  it("ne peut pas être écrite par le site, qui ne fait que lire", async () => {
    await expect(
      enTantQue("siklon_lecture", () => enregistrerLecture(db, "nhc-systemes", FLUX, "2026-09-10T16:00:00.000Z")),
    ).rejects.toThrow();
  });
});
