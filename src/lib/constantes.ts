// Section « Constantes et référentiels » de SPEC.md : aucune valeur en dur ailleurs.

/** « La tempête est passée sur l'île » (65 milles nautiques, outil Historical Hurricane Tracks de la NOAA). */
export const RADIUS_IMPACT_KM = 120;

/** Rayon de surveillance et d'alerte, mesuré depuis le point de référence de l'île. */
export const RADIUS_WATCH_KM = 300;

/** Rayon terrestre moyen (UGGI), pour les distances orthodromiques. */
export const RAYON_TERRE_KM = 6371.0088;

/** E-mails par jour de l'offre gratuite de Brevo (SPEC.md, choix techniques). */
export const QUOTA_EMAILS_JOUR = 300;

/** Part du quota quotidien jamais prise par les alertes : les e-mails de connexion restent prioritaires. */
export const RESERVE_EMAILS_AUTH = 50;

/** Saison cyclonique officielle de l'Atlantique (NHC), bornes incluses ; mois de 1 à 12 (US-17, US-18). */
export const DEBUT_SAISON = { mois: 6, jour: 1 } as const;
export const FIN_SAISON = { mois: 11, jour: 30 } as const;

/** Première saison comptée par « Saison à risque » (US-17) : début de l'ère satellite, données plus fiables. */
export const ANNEE_DEBUT_SAISON_RISQUE = 1966;

/** Part des passages que la phrase de « Saison à risque » regroupe dans la plus courte suite de mois (US-17). */
export const PART_SAISON_RISQUE = 0.75;

/** Écart maximal entre deux lectures du flux NHC (US-11) ; au-delà, une source sans lecture réussie est signalée au journal. */
export const INTERVALLE_MAX_LECTURE_NHC_MIN = 15;

/** Le fichier de contrôle de la vigilance Météo-France est relu chaque minute (US-11). */
export const INTERVALLE_CONTROLE_VIGILANCE_S = 60;
