-- Historique des cyclones (US-04) : base HURDAT2 du NHC et passages précalculés près des îles.
-- L'application y accède par une connexion Postgres directe : RLS activé sans politique,
-- donc rien n'est exposé par l'API Supabase (rôles anon et authenticated).

create table public.hurdat2_imports (
  id bigint generated always as identity primary key,
  fichier text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  version_nhc date not null,
  nb_tempetes integer not null check (nb_tempetes >= 0),
  importe_le timestamptz not null default now()
);

create table public.hurdat2_tempetes (
  id text primary key check (id ~ '^AL[0-9]{6}$'),
  annee smallint not null check (annee between 1851 and 2100),
  numero smallint not null check (numero between 0 and 99),
  nom text not null check (nom ~ '^[A-Z][A-Z0-9-]*$')
);

create table public.hurdat2_points (
  tempete_id text not null references public.hurdat2_tempetes (id) on delete cascade,
  rang smallint not null check (rang >= 0),
  horodatage timestamptz not null,
  identifiant char(1),
  statut text not null check (statut in ('TD', 'TS', 'HU', 'EX', 'SD', 'SS', 'LO', 'WV', 'DB')),
  lat real not null check (lat between -90 and 90),
  lon real not null check (lon between -180 and 180),
  vent_kt smallint check (vent_kt between 0 and 250),
  pression_mb smallint check (pression_mb between 850 and 1100),
  primary key (tempete_id, rang)
);

create table public.passages_iles (
  ile_slug text not null check (ile_slug ~ '^[a-z]+(-[a-z]+)*$'),
  tempete_id text not null references public.hurdat2_tempetes (id) on delete cascade,
  distance_min_km real not null check (distance_min_km >= 0),
  horodatage timestamptz not null,
  vent_max_kt smallint check (vent_max_kt between 0 and 250),
  categorie smallint check (categorie between -1 and 5),
  primary key (ile_slug, tempete_id)
);

create index passages_iles_ile_horodatage on public.passages_iles (ile_slug, horodatage desc);
create index passages_iles_tempete on public.passages_iles (tempete_id);

alter table public.hurdat2_imports enable row level security;
alter table public.hurdat2_tempetes enable row level security;
alter table public.hurdat2_points enable row level security;
alter table public.passages_iles enable row level security;
