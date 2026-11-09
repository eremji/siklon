import { EnTeteIle } from "./BandeauVigilance";

// Îles sans vigilance Météo-France : les watches/warnings NHC viendront avec l'issue #34.
export function AlertesNhcAVenir({ nomIle }: { nomIle: string }) {
  return (
    <>
      <EnTeteIle nomIle={nomIle}>
        <p className="text-xl font-bold">Alertes NHC bientôt disponibles</p>
      </EnTeteIle>
      <a
        href="https://www.nhc.noaa.gov/"
        className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-2"
      >
        Consulter les alertes sur le site du NHC
      </a>
    </>
  );
}
