const URL_NHC = "https://www.nhc.noaa.gov/";

/**
 * Lien vers le site du NHC placé dans une phrase : 44 px de haut, comme toute zone tactile
 * (DESIGN.md). Les marges négatives gardent l'interligne du paragraphe.
 */
export function LienNhc() {
  return (
    <a
      href={URL_NHC}
      className="-my-2.5 inline-flex min-h-11 items-center font-bold text-accent underline underline-offset-2"
    >
      nhc.noaa.gov
    </a>
  );
}
