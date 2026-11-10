import { cookies } from "next/headers";
import { connection } from "next/server";
import { CarteSystemes } from "@/components/carte/CarteSystemes";
import { previsionEnCache } from "@/lib/nhc/cache";
import { fluxNhc } from "@/lib/nhc/lecture";
import { chargerPrevisions } from "@/lib/nhc/previsions";
import { COOKIE_FIXTURE, fixtureDemandee, previsionsFixture } from "@/lib/nhc/source";
import { ListeSystemes } from "./ListeSystemes";

// Lit le flux NHC et les prévisions à chaque requête, jamais pendant le build,
// à travers le cache partagé (une lecture par minute au plus pour toutes les visites).
export async function SystemesActifs() {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const flux = await fluxNhc(fixture);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const previsions = fixture ? previsionsFixture(fixture) : await chargerPrevisions(systemes, previsionEnCache);
  return (
    <>
      {flux.etat === "ok" && <CarteSystemes systemes={systemes} previsions={previsions} />}
      <ListeSystemes flux={flux} previsions={previsions} />
    </>
  );
}
