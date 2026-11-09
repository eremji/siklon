// Accès à l'historique HURDAT2 en base. Requêtes paramétrées uniquement ($1, $2…) :
// aucune valeur n'est jamais concaténée dans le SQL.
import type { Categorie, PassageIle } from "../hurdat2/passages";
import type { PointHurdat2, TempeteHurdat2 } from "../hurdat2/parseur";

/** Ce dont ces fonctions ont besoin d'une connexion : un pool ou un client `pg`, ou PGlite. */
export interface Executeur {
  query(texte: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

export interface EntreeHistorique {
  tempeteId: string;
  nom: string;
  annee: number;
  distanceMinKm: number;
  horodatage: Date;
  ventMaxKt: number | null;
  categorie: Categorie | null;
}

export interface FiltresHistorique {
  ileSlug: string;
  categorieMin?: Categorie;
  anneeMin?: number;
  anneeMax?: number;
}

export interface TempeteHistorique {
  id: string;
  nom: string;
  annee: number;
  points: PointHurdat2[];
}

export interface ImportHistorique {
  fichier: string;
  sha256: string;
  /** Date de version du fichier NHC, AAAA-MM-JJ. */
  versionNhc: string;
  tempetes: TempeteHurdat2[];
  passages: PassageIle[];
}

export interface DernierImport {
  fichier: string;
  versionNhc: string;
  nbTempetes: number;
  importeLe: Date;
}

/** Passages près d'une île, du plus récent au plus ancien ; la période porte sur la saison (année HURDAT2). */
export async function lirePassages(db: Executeur, filtres: FiltresHistorique): Promise<EntreeHistorique[]> {
  const { rows } = await db.query(
    `select p.tempete_id as "tempeteId", t.nom, t.annee, p.distance_min_km as "distanceMinKm",
            p.horodatage, p.vent_max_kt as "ventMaxKt", p.categorie
       from public.passages_iles p
       join public.hurdat2_tempetes t on t.id = p.tempete_id
      where p.ile_slug = $1
        and ($2::smallint is null or p.categorie >= $2)
        and ($3::smallint is null or t.annee >= $3)
        and ($4::smallint is null or t.annee <= $4)
      order by p.horodatage desc`,
    [filtres.ileSlug, filtres.categorieMin ?? null, filtres.anneeMin ?? null, filtres.anneeMax ?? null],
  );
  return rows as EntreeHistorique[];
}

/** Tempête et trajectoire complète, ou null si l'identifiant est inconnu. */
export async function lireTempete(db: Executeur, id: string): Promise<TempeteHistorique | null> {
  const tempetes = await db.query("select id, nom, annee from public.hurdat2_tempetes where id = $1", [id]);
  const tempete = tempetes.rows[0] as Omit<TempeteHistorique, "points"> | undefined;
  if (!tempete) return null;
  const points = await db.query(
    `select horodatage, identifiant, statut, lat, lon, vent_kt as "ventKt", pression_mb as "pressionMb"
       from public.hurdat2_points where tempete_id = $1 order by rang`,
    [id],
  );
  return { ...tempete, points: points.rows as PointHurdat2[] };
}

export async function lireDernierImport(db: Executeur): Promise<DernierImport | null> {
  const { rows } = await db.query(
    `select fichier, to_char(version_nhc, 'YYYY-MM-DD') as "versionNhc", nb_tempetes as "nbTempetes",
            importe_le as "importeLe"
       from public.hurdat2_imports order by id desc limit 1`,
  );
  return (rows[0] as DernierImport | undefined) ?? null;
}

/**
 * Remplace tout l'historique en une transaction : en cas d'erreur, l'ancien reste en place.
 * Demande une connexion unique (client `pg` ou PGlite), pas un pool.
 */
export async function remplacerHistorique(db: Executeur, donnees: ImportHistorique): Promise<void> {
  const points = donnees.tempetes.flatMap((t) => t.points.map((p, rang) => ({ ...p, tempeteId: t.id, rang })));
  await db.query("begin");
  try {
    await db.query("delete from public.hurdat2_tempetes");
    await db.query(
      `insert into public.hurdat2_tempetes (id, annee, numero, nom)
       select * from unnest($1::text[], $2::smallint[], $3::smallint[], $4::text[])`,
      [donnees.tempetes.map((t) => t.id), donnees.tempetes.map((t) => t.annee), donnees.tempetes.map((t) => t.numero), donnees.tempetes.map((t) => t.nom)],
    );
    await db.query(
      `insert into public.hurdat2_points (tempete_id, rang, horodatage, identifiant, statut, lat, lon, vent_kt, pression_mb)
       select * from unnest($1::text[], $2::smallint[], $3::timestamptz[], $4::text[], $5::text[], $6::real[], $7::real[],
                            $8::smallint[], $9::smallint[])`,
      [
        points.map((p) => p.tempeteId),
        points.map((p) => p.rang),
        points.map((p) => p.horodatage.toISOString()),
        points.map((p) => p.identifiant),
        points.map((p) => p.statut),
        points.map((p) => p.lat),
        points.map((p) => p.lon),
        points.map((p) => p.ventKt),
        points.map((p) => p.pressionMb),
      ],
    );
    await db.query(
      `insert into public.passages_iles (ile_slug, tempete_id, distance_min_km, horodatage, vent_max_kt, categorie)
       select * from unnest($1::text[], $2::text[], $3::real[], $4::timestamptz[], $5::smallint[], $6::smallint[])`,
      [
        donnees.passages.map((p) => p.ileSlug),
        donnees.passages.map((p) => p.tempeteId),
        donnees.passages.map((p) => p.distanceMinKm),
        donnees.passages.map((p) => p.horodatage.toISOString()),
        donnees.passages.map((p) => p.ventMaxKt),
        donnees.passages.map((p) => p.categorie),
      ],
    );
    await db.query(
      "insert into public.hurdat2_imports (fichier, sha256, version_nhc, nb_tempetes) values ($1, $2, $3, $4)",
      [donnees.fichier, donnees.sha256, donnees.versionNhc, donnees.tempetes.length],
    );
    await db.query("commit");
  } catch (erreur) {
    await db.query("rollback");
    throw erreur;
  }
}
