import { cookies } from "next/headers";
import { connection } from "next/server";
import { CarteSystemes } from "@/components/carte/CarteSystemes";
import { chargerSystemesActifs } from "@/lib/nhc/client";
import { COOKIE_FIXTURE, etatFixture, fixtureDemandee } from "@/lib/nhc/source";
import { ListeSystemes } from "./ListeSystemes";

// Lit le flux NHC à chaque requête, jamais pendant le build.
export async function SystemesActifs() {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const flux = fixture ? etatFixture(fixture, new Date().toISOString()) : await chargerSystemesActifs();
  return (
    <>
      {flux.etat === "ok" && <CarteSystemes systemes={flux.systemes} />}
      <ListeSystemes flux={flux} />
    </>
  );
}
