"use client";
// Abonnement de l'appareil aux alertes web push (US-07). La permission n'est demandée qu'au clic sur
// le bouton (US-13). Le service worker public/sw.js affiche les alertes reçues.
import { useEffect, useState } from "react";

export type ResultatAbonnement = { ok: true } | { ok: false; message: string };

type Etat = "verification" | "non-pris-en-charge" | "non-configure" | "refuse" | "non-abonne" | "abonne";

const BOUTON = "min-h-12 rounded-full bg-accent px-6 text-base font-bold text-on-accent disabled:opacity-70";
const BOUTON_SECONDAIRE =
  "min-h-12 rounded-full border border-accent px-6 text-base font-bold text-accent disabled:opacity-70";

const TEXTES: Partial<Record<Etat, string>> = {
  verification: "Vérification de cet appareil…",
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
): Promise<{ etat: Etat; message?: string }> {
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
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    let actif = true;
    void (async () => {
      const initial = await etatAppareil(clePublique, abonner).catch(() => ({ etat: "non-pris-en-charge" as const }));
      if (!actif) return;
      setEtat(initial.etat);
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
