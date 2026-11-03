# Siklon : spécification V1

## Objectif
Permettre aux habitants des Antilles de suivre les cyclones en cours, de
savoir quand et comment un système menace leur île, de s'y préparer, et de
consulter l'historique des cyclones passés près de chez eux.

## Périmètre V1

| Sujet | Décision |
|---|---|
| Zone | Bassin Atlantique entier (tous les systèmes suivis par le NHC), avec un focus sur les îles des Antilles |
| Temps réel | Flux NHC `CurrentStorms.json` et produits associés (avis, cône, prévisions de trajectoire) |
| Historique | HURDAT2 (trajectoire, vents, pression toutes les 6 h), importé dans Postgres |
| Alertes | Vigilance Météo-France (vert, jaune, orange, rouge, violet, gris) pour Guadeloupe, Martinique, Saint-Martin et Saint-Barthélemy ; watches/warnings NHC pour les autres îles |
| Comptes | Oui : inscription, îles suivies, préférences de notification, checklist personnelle |
| Authentification | Compte Google ou email + mot de passe, via la bibliothèque Better Auth |
| Notifications | Web push (canal principal des alertes), email via Brevo (authentification et complément des alertes) |
| Langues | Français et anglais |
| Cible | Mobile d'abord, utilisable avec une connexion faible |

## User stories

Le « visiteur » n'a pas de compte ; l'« utilisateur » est connecté.

### US-01 : Voir les systèmes actifs sur une carte
En tant que visiteur, je veux voir sur une carte tous les systèmes actifs de
l'Atlantique, afin de savoir d'un coup d'œil si une menace existe.
- La carte affiche chaque système du flux NHC avec son nom, son type
  (dépression, tempête, ouragan) et sa catégorie.
- La trajectoire prévue et le cône d'incertitude sont affichés.
- Si aucun système n'est actif, un message l'indique clairement.
- L'heure du dernier avis NHC est affichée ; au-delà de 6 h sans mise à
  jour, un avertissement « données possiblement obsolètes » apparaît.
- La page reste utilisable sur un écran de 360 px de large.

### US-02 : Consulter la fiche d'une tempête active
En tant que visiteur, je veux ouvrir la fiche d'un système, afin de
connaître son intensité et son déplacement.
- La fiche affiche : vents maximaux soutenus, pression centrale, direction
  et vitesse de déplacement, position, catégorie.
- Elle affiche le numéro et l'heure de l'avis NHC, avec un lien vers
  la source officielle.
- Les unités sont affichées dans le système métrique, avec les valeurs
  d'origine du NHC (nœuds, mph) consultables.

### US-03 : Savoir dans combien de temps un système menace mon île
En tant que visiteur, je veux choisir une île et voir quand le système le
plus proche pourrait l'atteindre, afin d'organiser ma préparation.
- Pour chaque système actif dont la trajectoire prévue passe dans le rayon
  de menace de l'île, l'app affiche l'heure estimée du plus proche passage
  et la distance prévue.
- L'estimation est calculée à partir des positions prévues par le NHC
  (12 h, 24 h, 36 h, 48 h, 72 h, 96 h, 120 h) et présentée comme une
  estimation, avec l'heure de l'avis utilisé.
- Si aucun système ne menace l'île, l'app l'indique.
- Le rayon de menace est `RADIUS_WATCH_KM`, mesuré depuis le point de
  référence de l'île (voir « Constantes et référentiels »).

### US-04 : Consulter l'historique des cyclones d'une île
En tant que visiteur, je veux voir la liste des cyclones passés près d'une
île, afin de connaître le risque historique.
- La liste contient les cyclones HURDAT2 dont la trajectoire passe à moins
  de `RADIUS_IMPACT_KM` du point de référence de l'île, du plus récent au
  plus ancien.
- Chaque entrée affiche : nom, année, intensité maximale près de l'île,
  distance minimale et date du plus proche passage.
- La fiche d'un cyclone historique affiche sa trajectoire complète sur
  une carte.
- La liste peut être filtrée par catégorie et par période.

### US-05 : Créer un compte et suivre des îles
En tant que visiteur, je veux créer un compte et choisir les îles que je
suis, afin de recevoir des informations ciblées.
- L'inscription et la connexion se font avec un compte Google, ou avec
  un email et un mot de passe.
- Avec email et mot de passe : l'adresse est confirmée par un lien envoyé
  par email avant toute notification ; le mot de passe fait au moins
  12 caractères, n'est jamais stocké en clair, et peut être réinitialisé
  par un lien envoyé par email.
- Les tentatives de connexion répétées sont limitées.
- L'utilisateur choisit sa langue (FR ou EN) à l'inscription.
- L'utilisateur peut suivre une ou plusieurs îles et les retirer.
- L'utilisateur peut supprimer son compte et toutes ses données.

### US-06 : Voir le niveau d'alerte en cours de mon île
En tant que visiteur, je veux voir le niveau d'alerte officiel actuel
d'une île, afin de savoir quelle conduite adopter.
- Pour Guadeloupe, Martinique, Saint-Martin et Saint-Barthélemy : le
  niveau de vigilance Météo-France en cours, avec sa couleur et son
  libellé officiel. Aux Antilles, vigilance et alerte cyclonique forment
  un seul dispositif : ce flux suffit.
- Pour une autre île : les watches/warnings NHC en cours.
- La source et l'heure de mise à jour sont affichées.
- Sans alerte en cours, l'app l'indique.

### US-07 : Recevoir une notification quand mon île est menacée
En tant qu'utilisateur, je veux être prévenu quand une île que je suis
est menacée, afin de ne rien manquer même sans ouvrir l'app.
- Une notification est envoyée quand un système entre dans le rayon de
  menace d'une île suivie (US-03), et à chaque changement de niveau
  d'alerte de cette île (US-06).
- L'utilisateur choisit ses canaux : web push, email, ou les deux. Le web
  push est proposé en premier comme canal recommandé pour les alertes.
- Si le quota d'envoi d'emails est atteint, les emails d'authentification
  restent prioritaires sur les emails d'alerte, et l'échec est journalisé.
- Une même alerte n'est pas envoyée deux fois par le même canal.
- Chaque notification contient le lien vers la fiche concernée et la
  source officielle.
- La notification d'entrée dans le rayon de menace explique ce que ce
  rayon signifie, par exemple : « Ce système est prévu à moins de 300 km
  de votre île. Pour un cyclone de taille moyenne, cette alerte arrive
  avant que les vents de tempête n'atteignent l'île : c'est le moment de
  se préparer. » Le chiffre affiché provient de `RADIUS_WATCH_KM`.

### US-08 : Suivre une checklist de préparation
En tant qu'utilisateur, je veux une liste de choses à faire et à acheter
adaptée au niveau d'alerte, afin de me préparer sans rien oublier.
- La checklist de base existe pour chaque niveau d'alerte et provient des
  guides officiels (préfectures, Croix-Rouge) ; chaque élément cite sa
  source. Le contenu est relu et validé par le porteur du projet.
- La checklist affichée correspond au niveau d'alerte en cours de l'île
  choisie.
- L'utilisateur peut cocher des éléments, en ajouter et masquer ceux qui
  ne le concernent pas ; son état est conservé dans son compte.
- Un visiteur voit la checklist de base sans pouvoir l'enregistrer.

### US-09 : Garder l'historique des alertes
En tant que visiteur, je veux voir quand les niveaux d'alerte ont été
déclenchés pour une île et combien de temps ils ont duré.
- À partir de la mise en ligne de la V1, l'app enregistre chaque
  changement de niveau d'alerte (US-06) : île, niveau, début, fin, source.
- Pour un cyclone, la fiche affiche la chronologie des alertes de l'île
  et la durée de chaque niveau.
- Les alertes antérieures à la mise en ligne ne sont pas couvertes
  (voir hors périmètre).

### US-10 : Utiliser l'app en français ou en anglais
En tant que visiteur, je veux choisir ma langue, afin de comprendre toutes
les informations.
- Toute l'interface, les checklists et les notifications existent en
  français et en anglais.
- La langue par défaut suit celle du navigateur ; le choix est conservé.
- Les libellés officiels (vigilance, watches/warnings) sont traduits
  sans perdre le terme d'origine.

### US-11 : Avoir des données à jour
En tant que visiteur, je veux que les informations affichées soient les
plus récentes publiées, afin de ne pas me préparer sur une situation
dépassée.
- Le flux NHC `CurrentStorms.json` est interrogé au moins toutes les
  15 minutes.
- Le fichier de contrôle de la vigilance Météo-France est lu chaque minute ;
  le flux n'est téléchargé que si son checksum a changé.
- Un changement détecté (nouvel avis, nouveau niveau de vigilance) déclenche
  les notifications (US-07) sans attendre le cycle suivant.
- Si une source ne répond pas, l'app continue d'afficher la dernière donnée
  connue avec son heure, et un avertissement indique que la mise à jour a
  échoué.

### US-12 : Savoir d'où viennent les informations
En tant que visiteur, je veux voir la source de chaque information et le
rappel des consignes officielles, afin de savoir à qui me fier.
- Chaque donnée affichée indique sa source (NHC, Météo-France, HURDAT2) et
  son heure de mise à jour.
- Chaque fiche renvoie par un lien vers la source officielle.
- La mention « Siklon ne remplace pas les consignes officielles. Suivez
  les autorités locales. » est visible sur chaque page.

### US-13 : Maîtriser mes données personnelles
En tant qu'utilisateur, je veux savoir quelles données Siklon garde et
pouvoir les contrôler, afin d'utiliser l'app en confiance (RGPD).
- Aucune notification n'est envoyée sans consentement explicite ; la
  permission web push n'est demandée qu'après une action de l'utilisateur.
- L'utilisateur peut télécharger ses données (îles suivies, préférences,
  checklist) dans un fichier.
- La suppression du compte (US-05) efface toutes ses données, y compris
  chez le service d'envoi d'emails.
- Une page de confidentialité, accessible sans compte, explique les données
  collectées, leur usage et leur durée de conservation.
- Aucun secret (clés d'API, mots de passe) n'est présent dans le code : ils
  sont stockés dans les secrets Vercel et GitHub.

### US-14 : Utiliser l'app avec une connexion faible
En tant que visiteur pendant un cyclone, je veux que l'app s'affiche
rapidement même avec un réseau dégradé, afin d'obtenir l'information
quand j'en ai besoin.
- La première page utile s'affiche en moins de 3 s sur une connexion 3G.
- Si la carte interactive ne se charge pas, une carte simplifiée s'affiche
  à la place (voir DESIGN.md).
- Les informations essentielles (niveau de vigilance, délai avant passage)
  s'affichent avant la carte.

### US-15 : Utiliser l'app quelles que soient mes capacités
En tant que visiteur malvoyant, daltonien ou utilisant un lecteur d'écran,
je veux pouvoir lire et utiliser toute l'app, afin de recevoir les mêmes
informations que tout le monde.
- Tous les textes respectent un contraste AA (4,5:1), les éléments
  graphiques 3:1.
- Les zones tactiles font au moins 44 px ; le corps du texte au moins 16 px.
- Toutes les actions sont utilisables au clavier et au lecteur d'écran
  (libellés sur les boutons, champs et icônes).
- Aucune information ne repose sur la couleur seule : chaque niveau de
  vigilance est aussi écrit en toutes lettres.

### US-16 : Utiliser l'app en mode sombre
En tant que visiteur, je veux un affichage sombre la nuit ou pendant une
coupure de courant, afin de ménager mes yeux et ma batterie.
- Le thème suit le réglage du téléphone (clair ou sombre).
- Un bouton permet de forcer le thème clair ou sombre ; le choix est
  conservé.
- En mode sombre, tous les contrastes restent AA et l'en-tête de la page
  île garde la couleur de la vigilance en cours (voir DESIGN.md).

## Constantes et référentiels
Les tests et le code utilisent ces noms ; aucune valeur en dur ailleurs.

| Constante | Valeur | Justification |
|---|---|---|
| `RADIUS_IMPACT_KM` | 120 | « La tempête est passée sur l'île ». Équivaut aux 65 milles nautiques du rayon de recherche par défaut de l'outil Historical Hurricane Tracks de la NOAA. |
| `RADIUS_WATCH_KM` | 300 | Rayon de surveillance et d'alerte. Choix produit : les vents de force tempête peuvent s'étendre à plus de 300 km du centre (jusqu'à 335 km pour l'ouragan Alex), l'alerte part donc avant leur arrivée pour un cyclone de taille moyenne. |

Toutes les distances sont des distances orthodromiques (sur la sphère)
entre le centre du système et le point de référence de l'île.

### Flux vigilance Météo-France
- API Vigilance du portail `portail-api.meteofrance.fr`
  (DonneesPubliquesVigilance), web services `/vigilanceom/controle/dernier`
  et `/vigilanceom/flux/dernier`. Clé gratuite, stockée dans les secrets
  Vercel et GitHub sous `METEOFRANCE_API_KEY`.
- Fichiers JSON : `CDPV85TFFF` (Martinique), `CDPV85TFFR` (Guadeloupe),
  `CDPV85TFFJ` (Saint-Martin et Saint-Barthélemy).
- Polling : lire le fichier de contrôle chaque minute ; télécharger le
  flux uniquement quand son checksum change.

### Îles et points de référence
Un point par île : sa ville principale. Coordonnées à 0,01° près
(environ 1 km), retenues telles quelles pour la V1 ; elles pourront être
affinées plus tard sans changer le reste de la spec.

| Île | Point de référence | Lat | Lon | Source d'alerte |
|---|---|---|---|---|
| Guadeloupe | Pointe-à-Pitre | 16.24 | −61.53 | Météo-France |
| Martinique | Fort-de-France | 14.60 | −61.07 | Météo-France |
| Saint-Martin | Marigot | 18.07 | −63.08 | Météo-France |
| Saint-Barthélemy | Gustavia | 17.90 | −62.85 | Météo-France |
| Dominique | Roseau | 15.30 | −61.39 | NHC |
| Sainte-Lucie | Castries | 14.01 | −60.99 | NHC |
| Barbade | Bridgetown | 13.10 | −59.62 | NHC |
| Trinité | Port of Spain | 10.66 | −61.51 | NHC |
| Porto Rico | San Juan | 18.47 | −66.11 | NHC |
| Haïti | Port-au-Prince | 18.54 | −72.34 | NHC |
| République dominicaine | Saint-Domingue | 18.49 | −69.93 | NHC |
| Jamaïque | Kingston | 17.97 | −76.79 | NHC |
| Cuba | La Havane | 23.13 | −82.38 | NHC |

## Hors périmètre V1
- Dégâts, nombre de blessés et de morts des cyclones historiques (V2).
- Notifications par SMS.
- Connexion avec Apple ou Facebook.
- Plusieurs points de référence par île, ou distance au trait de côte.
  Limite connue : Cuba mesure environ 1 250 km, un cyclone peut frapper
  Santiago sans approcher La Havane.
- Historique des alertes antérieures à la mise en ligne de la V1.
- Applications mobiles natives (iOS, Android).
- Autres bassins (Pacifique, océan Indien).
- Prévisions propres à Siklon : l'app n'affiche que les données
  officielles.
- Langues autres que le français et l'anglais (créole, espagnol).
- Mode hors ligne complet.

## Choix techniques
- Authentification : Better Auth. Bibliothèque TypeScript qui gère, sans
  service externe, l'email + mot de passe (hachage, confirmation de
  l'adresse, réinitialisation), la connexion Google et la limitation des
  tentatives ; ses tables vivent dans notre Postgres.
- Envoi d'emails : Brevo, offre gratuite (300 emails/jour, sans limite
  de durée). Entreprise française, données hébergées dans l'UE. Clé
  stockée dans les secrets Vercel et GitHub sous `BREVO_API_KEY`.
- Limite connue : un cyclone peut déclencher 5 alertes (entrée dans le
  rayon, puis changements de vigilance) par utilisateur suivant une île ;
  au-delà d'environ 60 utilisateurs par île, le quota gratuit ne suffit
  plus. D'où le web push comme canal principal, et le passage au plan
  payant Brevo (Starter, environ 9 $/mois, sans limite quotidienne)
  avant d'atteindre ce seuil.
