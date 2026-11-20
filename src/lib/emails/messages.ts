// Contenu des emails d'authentification (US-05), dans la langue choisie à l'inscription.
// Texte brut et HTML minimal : lisibles dans tous les clients, même avec les images bloquées.

/** Durée de validité des liens envoyés par email, en secondes. */
export const VALIDITE_LIEN = {
  confirmation: 24 * 60 * 60,
  reinitialisation: 60 * 60,
} as const;

type Langue = "fr" | "en";

export interface ContenuEmail {
  sujet: string;
  texte: string;
  html: string;
}

const echapper = (texte: string) =>
  texte.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

interface Gabarit {
  sujet: string;
  intro: string;
  bouton: string;
  validite: string;
  fin: string;
}

function rediger(langue: Langue, { sujet, intro, bouton, validite, fin }: Gabarit, lien: string): ContenuEmail {
  const texte = [intro, "", lien, "", validite, fin, "", "Siklon"].join("\n");
  const html = `<!doctype html>
<html lang="${langue}">
<body style="font-family: system-ui, sans-serif; font-size: 16px; line-height: 1.5;">
<p>${echapper(intro)}</p>
<p><a href="${echapper(lien)}">${echapper(bouton)}</a></p>
<p>${echapper(validite)} ${echapper(fin)}</p>
<p>Siklon</p>
</body>
</html>`;
  return { sujet: `${sujet} · Siklon`, texte, html };
}

const CONFIRMATION: Record<Langue, Gabarit> = {
  fr: {
    sujet: "Confirmez votre adresse email",
    intro: "Bienvenue sur Siklon. Pour confirmer votre adresse email, ouvrez ce lien :",
    bouton: "Confirmer mon adresse",
    validite: "Ce lien reste valable 24 heures.",
    fin: "Si vous n'avez pas créé de compte Siklon, ignorez cet email.",
  },
  en: {
    sujet: "Confirm your email address",
    intro: "Welcome to Siklon. To confirm your email address, open this link:",
    bouton: "Confirm my address",
    validite: "This link is valid for 24 hours.",
    fin: "If you did not create a Siklon account, ignore this email.",
  },
};

const REINITIALISATION: Record<Langue, Gabarit> = {
  fr: {
    sujet: "Réinitialisez votre mot de passe",
    intro: "Pour choisir un nouveau mot de passe Siklon, ouvrez ce lien :",
    bouton: "Choisir un nouveau mot de passe",
    validite: "Ce lien reste valable 1 heure.",
    fin: "Si vous n'avez rien demandé, ignorez cet email : votre mot de passe ne change pas.",
  },
  en: {
    sujet: "Reset your password",
    intro: "To choose a new Siklon password, open this link:",
    bouton: "Choose a new password",
    validite: "This link is valid for 1 hour.",
    fin: "If you did not ask for this, ignore this email: your password stays the same.",
  },
};

export const emailConfirmation = (langue: Langue, lien: string) => rediger(langue, CONFIRMATION[langue], lien);
export const emailReinitialisation = (langue: Langue, lien: string) => rediger(langue, REINITIALISATION[langue], lien);
