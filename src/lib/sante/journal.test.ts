// Le journal des lectures est-il encore alimenté par la vérification de chaque minute (#164) ?
import { describe, expect, it } from "vitest";
import { RETARD_MAX_JOURNAL_MIN } from "../constantes";
import { etatJournal } from "./journal";

const MAINTENANT = new Date("2026-09-10T15:00:00.000Z");
const ilYa = (minutes: number) => new Date(MAINTENANT.getTime() - minutes * 60_000).toISOString();

describe("état du journal des lectures", () => {
  it("est à jour quand la dernière écriture date de moins que le seuil", () => {
    expect(etatJournal(ilYa(1), MAINTENANT)).toBe("a-jour");
  });

  it("est encore à jour pile au seuil", () => {
    expect(etatJournal(ilYa(RETARD_MAX_JOURNAL_MIN), MAINTENANT)).toBe("a-jour");
  });

  it("est en retard au-delà du seuil", () => {
    expect(etatJournal(ilYa(RETARD_MAX_JOURNAL_MIN + 1), MAINTENANT)).toBe("en-retard");
  });

  it("est en retard quand le journal est vide", () => {
    expect(etatJournal(null, MAINTENANT)).toBe("en-retard");
  });

  it("le seuil vaut 30 minutes (SPEC.md)", () => {
    expect(RETARD_MAX_JOURNAL_MIN).toBe(30);
  });
});
