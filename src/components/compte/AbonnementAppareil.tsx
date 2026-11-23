"use client";
// Abonnement de l'appareil aux alertes web push (US-07). La permission n'est demandée qu'au clic sur
// le bouton (US-13). Le service worker public/sw.js affiche les alertes reçues.
// Sur iPhone et iPad, Apple ne l'autorise que depuis l'écran d'accueil : la section explique alors
// comment y ajouter Siklon (US-07c, #110).
import { Lien } from "@/components/langue/Lien";
import { useEffect, useState } from "react";
import { EtapesEcranAccueil } from "@/components/ecranAccueil/EtapesEcranAccueil";
import {
  type Appareil,
  ouvertDepuisEcranAccueil,
  situationEcranAccueil,
  VERSION_IOS_MIN,
} from "@/lib/ecranAccueil/detection";

export type ResultatAbonnement = { ok: true } | { ok: false; message: string };

type Etat =
  | "verification"
  | "ios-a-installer"
  | "ios-trop-ancien"
  | "ios-autre-navigateur"
  | "non-pris-en-charge"
  | "non-configure"
  | "refuse"
  | "non-abonne"
  | "abonne";

const BOUTON = "min-h-12 rounded-full bg-accent px-6 text-base font-bold text-on-accent disabled:opacity-70";
const BOUTON_SECONDAIRE =
  "min-h-12 rounded-full border border-accent px-6 text-base font-bold text-accent disabled:opacity-70";

const TEXTES: Partial<Record<Etat, string>> = {
  verification: "Vérification de cet appareil…",
  "ios-trop-ancien": `Mettez à jour iOS (${VERSION_IOS_MIN} ou plus récent) pour recevoir les alertes sur cet appareil.`,
  "ios-autre-navigateur":
    "Pour recevoir les alertes sur cet appareil, ouvrez Siklon dans Safari, puis ajoutez-le à l'écran d'accueil.",
  "non-pris-en-charge": "Ce navigateur ne permet pas de recevoir les alertes sur cet appareil.",
  "non-configure": "Les alertes sur appareil ne sont pas encore disponibles.",
  refuse:
    "Les notifications de Siklon sont bloquées dans ce navigateur. Pour recevoir les alertes, autorisez-les dans les réglages du site, puis rechargez la page.",
};

const ECHEC = "L'abonnement a échoué. Réessayez plus tard.";

function pushPrisEnCharge(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Clé publique VAPID (base64url) sous la forme attendue par pushManager.subscribe. */
function octets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
}

/**
 * État de l'appareil au chargement. Un appareil déjà abonné est réenregistré pour le compte connecté :
 * il a pu servir à un autre compte, ou perdre son abonnement côté serveur.
 */
async function etatAppareil(
  clePublique: string | null,
  abonner: (abonnement: unknown) => Promise<ResultatAbonnement>,
): Promise<{ etat: Etat; appareil?: Appareil; message?: string }> {
  const situation = situationEcranAccueil({
    agent: navigator.userAgent,
    pointsTactiles: navigator.maxTouchPoints ?? 0,
    installe: typeof window.matchMedia === "function" && ouvertDepuisEcranAccueil(window),
  });
  if (situation.etat === "a-installer") return { etat: "ios-a-installer", appareil: situation.appareil };
  if (situation.etat === "ios-trop-ancien" || situation.etat === "ios-autre-navigateur") return { etat: situation.etat };
  if (!pushPrisEnCharge()) return { etat: "non-pris-en-charge" };
  if (!clePublique) return { etat: "non-configure" };
  if (Notification.permission === "denied") return { etat: "refuse" };
  const enregistrement = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const abonnement = await enregistrement.pushManager.getSubscription();
  if (!abonnement) return { etat: "non-abonne" };
  const resultat = await abonner(abonnement.toJSON());
  return resultat.ok ? { etat: "abonne" } : { etat: "non-abonne", message: resultat.message };
}

export function AbonnementAppareil({
  clePublique,
  abonner,
  desabonner,
}: {
  clePublique: string | null;
  abonner: (abonnement: unknown) => Promise<ResultatAbonnement>;
  desabonner: (endpoint: unknown) => Promise<ResultatAbonnement>;
}) {
  const [etat, setEtat] = useState<Etat>("verification");
  const [appareil, setAppareil] = useState<Appareil>("iphone");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    let actif = true;
    void (async () => {
      const initial = await etatAppareil(clePublique, abonner).catch(() => ({ etat: "non-pris-en-charge" as const }));
      if (!actif) return;
      setEtat(initial.etat);
      if ("appareil" in initial && initial.appareil) setAppareil(initial.appareil);
      if ("message" in initial && initial.message) setErreur(initial.message);
    })();
    return () => {
      actif = false;
    };
  }, [clePublique, abonner]);

  async function activer() {
    if (!clePublique) return;
    setEnCours(true);
    setErreur("");
    setConfirmation("");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") return setEtat("refuse");
      if (permission !== "granted") return setErreur("Autorisez les notifications quand le navigateur le demande.");
      const { pushManager } = await navigator.serviceWorker.ready;
      const abonnement = await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets(clePublique) });
      const resultat = await abonner(abonnement.toJSON());
      if (!resultat.ok) {
        await abonnement.unsubscribe();
        return setErreur(resultat.message);
      }
      setEtat("abonne");
    } catch {
      setErreur(ECHEC);
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    setEnCours(true);
    setErreur("");
    try {
      const { pushManager } = await navigator.serviceWorker.ready;
      const abonnement = await pushManager.getSubscription();
      if (abonnement) {
        const { endpoint } = abonnement;
        await abonnement.unsubscribe();
        const resultat = await desabonner(endpoint);
        if (!resultat.ok) return setErreur(resultat.message);
      }
      setEtat("non-abonne");
      setConfirmation("Cet appareil ne recevra plus les alertes.");
    } catch {
      setErreur("Le désabonnement a échoué. Réessayez plus tard.");
    } finally {
      setEnCours(false);
    }
  }

  const texte = TEXTES[etat];
  return (
    <section aria-labelledby="appareil-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 id="appareil-titre" className="text-xl font-bold">
        Alertes sur cet appareil
      </h2>
      <p className="text-base">
        Canal recommandé : une notification arrive sur cet appareil dès qu&apos;une île que vous suivez est menacée,
        même quand Siklon est fermé.
      </p>
      {texte && <p className={etat === "verification" ? "text-base text-muted" : "text-base font-bold"}>{texte}</p>}
      {etat === "ios-a-installer" && (
        <>
          <div className="flex flex-col gap-3 rounded-xl bg-soft p-4">
            <p className="text-lg font-bold">
              Sur {appareil === "ipad" ? "iPad" : "iPhone"}, ajoutez d&apos;abord Siklon à l&apos;écran d&apos;accueil
            </p>
            <p className="text-base text-muted">
              Apple n&apos;autorise les notifications que pour les sites ajoutés à l&apos;écran d&apos;accueil (iOS{" "}
              {VERSION_IOS_MIN} ou plus récent).
            </p>
            <EtapesEcranAccueil appareil={appareil} />
          </div>
          <Lien href="/compte/ecran-accueil" className={`flex items-center justify-center ${BOUTON_SECONDAIRE}`}>
            Voir l&apos;aide en images
          </Lien>
        </>
      )}
      {etat === "non-abonne" && (
        <button type="button" onClick={activer} disabled={enCours} aria-busy={enCours} className={BOUTON}>
          Recevoir les alertes sur cet appareil
        </button>
      )}
      {etat === "abonne" && (
        <>
          <p className="text-base font-bold">Cet appareil reçoit les alertes.</p>
          <button type="button" onClick={desactiver} disabled={enCours} aria-busy={enCours} className={BOUTON_SECONDAIRE}>
            Se désabonner
          </button>
        </>
      )}
      {erreur && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-base font-bold text-danger-text">
          {erreur}
        </p>
      )}
      <p role="status" className="text-base font-bold empty:hidden">
        {confirmation}
      </p>
    </section>
  );
}
