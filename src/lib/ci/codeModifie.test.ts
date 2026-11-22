// @vitest-environment node
// Règle de la CI (#105) : une PR qui ne modifie que des fichiers Markdown saute les jobs lourds
// (typecheck, test, build, e2e). Aucun code ni test ne lit de `.md`, donc rien ne peut casser.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../../.github/scripts/code-modifie.sh", import.meta.url));

// Le script lit la liste des fichiers modifiés (un par ligne) et répond `true` ou `false`.
const codeModifie = (fichiers: string[]) =>
  execFileSync("sh", [SCRIPT], { input: fichiers.map((f) => `${f}\n`).join(""), encoding: "utf8" }).trim();

describe("code modifié par une PR", () => {
  it("non quand la PR ne touche que des fichiers Markdown", () => {
    expect(codeModifie(["README.md", "SPEC.md", ".claude/skills/ship/SKILL.md"])).toBe("false");
  });

  it("oui dès qu'un seul fichier n'est pas du Markdown", () => {
    expect(codeModifie(["README.md", "src/lib/iles.ts"])).toBe("true");
  });

  it("oui quand la CI elle-même change", () => {
    expect(codeModifie([".github/workflows/ci.yml"])).toBe("true");
  });

  it("oui pour un fichier dont le nom contient .md sans finir par .md", () => {
    expect(codeModifie(["docs/notes.md.ts", "src/a.mdx"])).toBe("true");
  });

  it("oui par prudence quand la liste est vide", () => {
    expect(codeModifie([])).toBe("true");
  });
});
