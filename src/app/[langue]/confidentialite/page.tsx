import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import type { ReactNode } from "react";
import { DUREE_REAUTHENTIFICATION_MINUTES, DUREE_SESSION_JOURS, LIMITES_TENTATIVES } from "@/lib/auth/options";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import type { Langue } from "@/lib/langues";

// Texte juridique : un texte complet par langue plutôt que des morceaux de phrases (US-10).
// Les deux versions disent la même chose ; à modifier ensemble.
const PAGE: Record<Langue, { titre: string; description: string; miseAJour: string }> = {
  fr: {
    titre: "Confidentialité",
    description: "Les données que Siklon collecte, où elles sont gardées, et les tiers qui voient votre adresse IP.",
    miseAJour: "Mise à jour : 26 novembre 2026.",
  },
  en: {
    titre: "Privacy",
    description: "The data Siklon collects, where it is kept, and the third parties that see your IP address.",
    miseAJour: "Last updated: 26 November 2026.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = PAGE[await langueDeLaPage()];
  return { title: `${titre} · Siklon`, description };
}

// Décrit l'état actuel du site. À mettre à jour à chaque nouvelle donnée collectée
// (emails, connexion Google, notifications : US-05, US-07, US-13).

// Les compteurs de tentatives (clé : adresse IP) sont purgés après la plus longue fenêtre.
const MINUTES_COMPTEURS = Math.max(...Object.values(LIMITES_TENTATIVES).map((l) => l.window)) / 60;

function Section({ id, titre, children }: { id: string; titre: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-xl font-bold">
        {titre}
      </h2>
      {children}
    </section>
  );
}

function LienExterne({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-accent underline underline-offset-4">
      {children}
    </a>
  );
}

function TexteFr() {
  return (
    <>
      <Section id="collecte" titre="Ce que Siklon collecte">
        <p>
          Sans compte, rien : toutes les informations sur les cyclones et les îles se consultent sans compte ni
          information personnelle. Siklon n&apos;utilise aucune mesure d&apos;audience ni aucune publicité.
        </p>
        <p>
          Le compte est facultatif. Il contient seulement votre adresse email, la langue choisie (français ou anglais),
          les îles que vous suivez et votre mot de passe, qui n&apos;est jamais en clair : seule son empreinte (scrypt)
          est gardée. Siklon ne demande ni votre nom, ni votre photo.
        </p>
        <p>Cette langue change si vous changez de langue en bas de page en étant connecté.</p>
        <p>
          Les filtres de l&apos;historique (période, intensité) restent dans l&apos;adresse de la page : ils ne sont pas
          enregistrés.
        </p>
      </Section>

      <Section id="alertes-appareil" titre="Alertes sur un appareil">
        <p>
          Seulement si vous le demandez depuis la page Compte, Siklon garde l&apos;adresse d&apos;abonnement que le
          service de notification de votre navigateur (Google pour Chrome, Mozilla pour Firefox, Apple pour Safari,
          Microsoft pour Edge) attribue à cet appareil, et les clés qui servent à chiffrer les alertes. Ce service
          transmet les alertes à votre appareil : elles sont chiffrées, il ne peut pas les lire.
        </p>
        <p>
          L&apos;abonnement est effacé quand vous choisissez « Se désabonner », quand le service de notification
          signale qu&apos;il n&apos;est plus valable, ou avec votre compte.
        </p>
      </Section>

      <Section id="alertes-email" titre="Alertes par e-mail">
        <p>
          Siklon vous envoie les alertes par e-mail seulement si vous cochez « Recevoir les alertes par e-mail » sur la
          page Compte. Elles partent par{" "}
          <LienExterne href="https://www.brevo.com/fr/legal/privacypolicy/">Brevo</LienExterne>, le service qui envoie
          déjà les emails du compte.
        </p>
        <p>Pour ne plus les recevoir, décochez la case : votre choix est gardé avec votre compte.</p>
      </Section>

      <Section id="connexion-google" titre="Connexion avec Google">
        <p>
          Vous pouvez aussi vous connecter avec votre compte Google. Google transmet alors à Siklon votre adresse email,
          l&apos;indication qu&apos;elle est confirmée et un identifiant de votre compte Google. Siklon ne garde ni votre
          nom, ni votre photo, ni aucun jeton d&apos;accès : il n&apos;accède à rien d&apos;autre dans votre compte
          Google.
        </p>
        <p>
          De son côté, Google sait que vous utilisez Siklon, comme pour tout site où vous vous connectez avec lui. Il
          traite ces informations selon ses{" "}
          <LienExterne href="https://policies.google.com/privacy?hl=fr">règles de confidentialité de Google</LienExterne>.
        </p>
      </Section>

      <Section id="cookie" titre="Cookies">
        <p>
          Siklon dépose un cookie seulement si vous vous connectez : il garde votre session ouverte pendant{" "}
          {DUREE_SESSION_JOURS} jours au plus, et disparaît quand vous vous déconnectez. Il est indispensable à la
          connexion, et ne sert à rien d&apos;autre.
        </p>
        <p>
          Si vous vous connectez avec Google, un second cookie protège l&apos;aller-retour vers Google contre une
          usurpation ; il s&apos;efface au bout de quelques minutes.
        </p>
      </Section>

      <Section id="conservation" titre="Où et combien de temps">
        <p>
          Les données du compte sont gardées dans une base de données hébergée à Paris par{" "}
          <LienExterne href="https://supabase.com/privacy">Supabase</LienExterne>, tant que le compte existe.
        </p>
        <p>
          Les emails du compte (confirmation de l&apos;adresse, réinitialisation du mot de passe) sont envoyés par{" "}
          <LienExterne href="https://www.brevo.com/fr/legal/privacypolicy/">Brevo</LienExterne> (France), qui reçoit
          pour cela votre adresse email et garde un journal des envois.
        </p>
        <p>
          Pour bloquer les tentatives de connexion répétées, Siklon compte les essais par adresse IP : ce compteur est
          effacé au bout de {MINUTES_COMPTEURS} minutes. Votre adresse IP n&apos;est jamais gardée avec votre compte.
        </p>
      </Section>

      <Section id="suppression" titre="Supprimer vos données">
        <p>
          Depuis la{" "}
          <Lien href="/compte" className="text-accent underline underline-offset-4">
            page Compte
          </Lien>
          , une fois connecté, vous pouvez supprimer votre compte : il est effacé immédiatement avec toutes ses données
          (adresse email, langue, îles suivies, appareils abonnés aux alertes, accord pour les alertes par e-mail, empreinte du mot de passe, sessions), y
          compris chez Brevo, qui efface le journal des emails envoyés à votre adresse. Votre mot de passe vous est
          demandé pour confirmer ; si votre compte n&apos;en a pas, il suffit de vous reconnecter avec Google dans les{" "}
          {DUREE_REAUTHENTIFICATION_MINUTES} minutes qui précèdent.
        </p>
      </Section>

      <Section id="adresse-ip" titre="Qui voit votre adresse IP">
        <p>
          Comme tout site, Siklon ne peut s&apos;afficher sans que votre adresse IP soit vue par les services qui
          le transmettent :
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Vercel</strong> (États-Unis), qui héberge Siklon, reçoit votre adresse IP et les informations
            techniques de chaque visite (page demandée, navigateur) pour vous servir le site. Il les traite selon{" "}
            <LienExterne href="https://vercel.com/legal/privacy-policy">la politique de confidentialité de Vercel</LienExterne>.
          </li>
          <li>
            <strong>OpenFreeMap</strong> fournit le fond de la carte des systèmes actifs. Votre navigateur lui demande
            directement les morceaux de carte à afficher : il reçoit votre adresse IP et la zone de la carte que vous
            regardez.{" "}
            <LienExterne href="https://openfreemap.org/">En savoir plus sur OpenFreeMap</LienExterne>.
          </li>
        </ul>
        <p>Les polices de caractères sont servies par Siklon lui-même : aucun autre service n&apos;est contacté.</p>
      </Section>

      <Section id="sources" titre="Sources de données">
        <p>
          Les données du NHC, de la NOAA et de Météo-France, ainsi que l&apos;historique des cyclones, sont lues par le
          serveur de Siklon, jamais par votre navigateur. Ces organismes ne reçoivent aucune information sur vous.
        </p>
        <p>
          Si vous suivez un lien vers le site du NHC ou de Météo-France, vous quittez Siklon : ce site applique alors
          sa propre politique de confidentialité.
        </p>
      </Section>

    </>
  );
}

function TexteEn() {
  return (
    <>
      <Section id="collecte" titre="What Siklon collects">
        <p>
          Without an account, nothing: all information about cyclones and islands is available without an account or
          any personal information. Siklon uses no audience measurement and no advertising.
        </p>
        <p>
          The account is optional. It only contains your email address, the language you chose (French or English),
          the islands you follow and your password, which is never stored in plain text: only its hash (scrypt) is
          kept. Siklon does not ask for your name or your photo.
        </p>
        <p>This language changes if you switch language at the bottom of the page while signed in.</p>
        <p>History filters (period, intensity) stay in the page address: they are not saved.</p>
      </Section>

      <Section id="alertes-appareil" titre="Alerts on a device">
        <p>
          Only if you ask for it from the Account page, Siklon keeps the subscription address that your browser&apos;s
          notification service (Google for Chrome, Mozilla for Firefox, Apple for Safari, Microsoft for Edge) assigns to
          this device, and the keys used to encrypt alerts. This service delivers the alerts to your device: they are
          encrypted, and it cannot read them.
        </p>
        <p>
          The subscription is erased when you choose “Unsubscribe”, when the notification service reports that it is no
          longer valid, or with your account.
        </p>
      </Section>

      <Section id="alertes-email" titre="Email alerts">
        <p>
          Siklon only sends you alerts by email if you tick “Receive alerts by email” on the Account page. They are sent
          through <LienExterne href="https://www.brevo.com/legal/privacypolicy/">Brevo</LienExterne>, the service that
          already sends the account emails.
        </p>
        <p>To stop receiving them, untick the box: your choice is kept with your account.</p>
      </Section>

      <Section id="connexion-google" titre="Signing in with Google">
        <p>
          You can also sign in with your Google account. Google then sends Siklon your email address, the fact that it
          is confirmed, and an identifier for your Google account. Siklon keeps neither your name, nor your photo, nor
          any access token: it accesses nothing else in your Google account.
        </p>
        <p>
          For its part, Google knows that you use Siklon, as with any site where you sign in with it. It processes this
          information according to{" "}
          <LienExterne href="https://policies.google.com/privacy?hl=en">Google&apos;s privacy policy</LienExterne>.
        </p>
      </Section>

      <Section id="cookie" titre="Cookies">
        <p>
          Siklon only sets a cookie if you sign in: it keeps your session open for up to {DUREE_SESSION_JOURS} days, and
          disappears when you sign out. It is essential for signing in, and is used for nothing else.
        </p>
        <p>
          If you sign in with Google, a second cookie protects the round trip to Google against impersonation; it is
          deleted after a few minutes.
        </p>
      </Section>

      <Section id="conservation" titre="Where and for how long">
        <p>
          Account data is kept in a database hosted in Paris by{" "}
          <LienExterne href="https://supabase.com/privacy">Supabase</LienExterne>, for as long as the account exists.
        </p>
        <p>
          Account emails (address confirmation, password reset) are sent by{" "}
          <LienExterne href="https://www.brevo.com/legal/privacypolicy/">Brevo</LienExterne> (France), which receives
          your email address for this purpose and keeps a log of the emails sent.
        </p>
        <p>
          To block repeated sign-in attempts, Siklon counts attempts per IP address: this counter is erased after{" "}
          {MINUTES_COMPTEURS} minutes. Your IP address is never kept with your account.
        </p>
      </Section>

      <Section id="suppression" titre="Deleting your data">
        <p>
          From the{" "}
          <Lien href="/compte" className="text-accent underline underline-offset-4">
            Account page
          </Lien>
          , once signed in, you can delete your account: it is erased immediately with all its data (email address,
          language, followed islands, devices subscribed to alerts, consent to email alerts, password hash, sessions),
          including at Brevo, which erases the log of emails sent to your address. Your password is asked for to
          confirm; if your account has none, you just need to have signed in again with Google within the previous{" "}
          {DUREE_REAUTHENTIFICATION_MINUTES} minutes.
        </p>
      </Section>

      <Section id="adresse-ip" titre="Who sees your IP address">
        <p>Like any site, Siklon cannot be displayed without your IP address being seen by the services that deliver it:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Vercel</strong> (United States), which hosts Siklon, receives your IP address and the technical
            information of each visit (page requested, browser) to serve you the site. It processes them according to{" "}
            <LienExterne href="https://vercel.com/legal/privacy-policy">Vercel&apos;s privacy policy</LienExterne>.
          </li>
          <li>
            <strong>OpenFreeMap</strong> provides the base map of active systems. Your browser asks it directly for the
            map tiles to display: it receives your IP address and the area of the map you are looking at.{" "}
            <LienExterne href="https://openfreemap.org/">Learn more about OpenFreeMap</LienExterne>.
          </li>
        </ul>
        <p>Fonts are served by Siklon itself: no other service is contacted.</p>
      </Section>

      <Section id="sources" titre="Data sources">
        <p>
          NHC, NOAA and Météo-France data, as well as cyclone history, are read by Siklon&apos;s server, never by your
          browser. These organisations receive no information about you.
        </p>
        <p>
          If you follow a link to the NHC or Météo-France website, you leave Siklon: that site then applies its own
          privacy policy.
        </p>
      </Section>
    </>
  );
}

export default async function Page() {
  const langue = await langueDeLaPage();
  const { titre, miseAJour } = PAGE[langue];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 text-base">
      <h1 className="text-3xl font-bold">{titre}</h1>
      {langue === "fr" ? <TexteFr /> : <TexteEn />}
      <div className="flex flex-col gap-1 text-sm text-muted">
        <p>{miseAJour}</p>
        <MentionOfficielle className="" />
      </div>
    </main>
  );
}
