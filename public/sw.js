// Service worker de Siklon (US-07) : affiche les alertes reçues par web push et, au clic, ouvre la
// fiche concernée. Il ne met rien en cache. Le message vient de messagePush
// (src/lib/notifications/push.ts) : { titre, texte, lien, etiquette, langue }.

const ALERTE_GENERIQUE = { titre: "Siklon : nouvelle alerte", texte: "Ouvrez Siklon pour voir l'alerte.", lien: "/" };

// Langue du compte (US-10) : le français si elle manque ou n'est pas connue.
function langueDuMessage(message) {
  return message.langue === "en" || message.langue === "fr" ? message.langue : "fr";
}

// Seules les pages de Siklon s'ouvrent depuis une notification. Sinon l'accueil, dans la langue
// donnée, ou sans langue (le proxy choisit celle du visiteur).
function lienSiklon(lien, langue) {
  try {
    const url = new URL(lien, self.location.origin);
    if (url.origin === self.location.origin) return url.href;
  } catch {
    // Lien illisible : l'accueil.
  }
  return new URL(langue ? `/${langue}` : "/", self.location.origin).href;
}

function lireMessage(evenement) {
  try {
    const message = evenement.data ? evenement.data.json() : null;
    if (message && typeof message.titre === "string" && typeof message.texte === "string") return message;
  } catch {
    // Contenu illisible : l'alerte générique.
  }
  return ALERTE_GENERIQUE;
}

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(self.clients.claim());
});

// Chaque message reçu affiche une notification, même illisible : le navigateur l'exige.
self.addEventListener("push", (evenement) => {
  const message = lireMessage(evenement);
  const lang = langueDuMessage(message);
  // Alerte générique : langue inconnue, l'accueil sans langue.
  const lien = lienSiklon(message.lien, message === ALERTE_GENERIQUE ? undefined : lang);
  const options = { body: message.texte, lang, data: { lien } };
  if (typeof message.etiquette === "string") options.tag = message.etiquette;
  evenement.waitUntil(self.registration.showNotification(message.titre, options));
});

self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  const lien = lienSiklon(evenement.notification.data && evenement.notification.data.lien);
  evenement.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((fenetre) => fenetre.url === lien);
      return ouverte ? ouverte.focus() : self.clients.openWindow(lien);
    }),
  );
});
