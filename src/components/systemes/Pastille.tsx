import { type Classification, type SystemeActif, categorieSaffirSimpson } from "@/lib/nhc/systemes";

const ABREVIATIONS: Record<Classification, string> = {
  TD: "DT",
  STD: "DS",
  TS: "TT",
  STS: "TS",
  HU: "",
  PTC: "CP",
};

// 46 px dans les listes (DESIGN.md) ; « petite » sur la carte, pour limiter les chevauchements.
export function Pastille({ systeme, petite = false }: { systeme: SystemeActif; petite?: boolean }) {
  const categorie = systeme.classification === "HU" ? categorieSaffirSimpson(systeme.ventKt) : null;
  const ouragan = systeme.classification === "HU";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 bg-surface font-bold ${
        petite ? "size-8 text-sm" : "size-[46px] text-lg"
      } ${
        ouragan ? "border-danger text-danger-text" : "border-accent text-accent"
      }`}
    >
      {categorie ?? ABREVIATIONS[systeme.classification]}
    </span>
  );
}
