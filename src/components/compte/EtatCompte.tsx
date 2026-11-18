// Contenu de la page Compte selon la session (US-05) : invitation à se connecter, ou résumé du compte.
import Link from "next/link";
import type { Langue } from "@/lib/auth/options";
import type { UtilisateurCourant } from "@/lib/auth/serveur";

const NOMS_LANGUES: Record<Langue, { libelle: string; lang: string }> = {
  fr: { libelle: "Français", lang: "fr" },
  en: { libelle: "English", lang: "en" },
};

const LIEN_PRINCIPAL = "flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-bold text-on-accent";
const LIEN_SECONDAIRE =
  "flex min-h-12 items-center justify-center rounded-full border border-accent px-6 text-base font-bold text-accent";

export function EtatCompte({
  utilisateur,
  deconnecter,
}: {
  utilisateur: UtilisateurCourant | null;
  deconnecter: () => Promise<void>;
}) {
  if (!utilisateur) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base">
          Toutes les informations sur les cyclones se consultent sans compte. Un compte servira à suivre vos îles et à
          recevoir des alertes.
        </p>
        <Link href="/compte/connexion" className={LIEN_PRINCIPAL}>
          Se connecter
        </Link>
        <Link href="/compte/inscription" className={LIEN_SECONDAIRE}>
          Créer un compte
        </Link>
      </div>
    );
  }

  const langue = NOMS_LANGUES[utilisateur.langue];
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3 rounded-2xl bg-surface p-4 text-base">
        <div>
          <dt className="text-sm text-muted">Adresse email</dt>
          <dd className="font-bold break-all">{utilisateur.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Adresse</dt>
          <dd className="font-bold">{utilisateur.emailVerifie ? "Confirmée" : "Non confirmée"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Langue des messages</dt>
          <dd lang={langue.lang} className="font-bold">
            {langue.libelle}
          </dd>
        </div>
      </dl>
      <form action={deconnecter}>
        <button type="submit" className={`${LIEN_SECONDAIRE} w-full`}>
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
