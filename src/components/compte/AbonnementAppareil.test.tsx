import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AbonnementAppareil, type ResultatAbonnement } from "./AbonnementAppareil";

const CLE_PUBLIQUE = "BPublique_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/appareil";

function abonnementSimule() {
  const json = { endpoint: ENDPOINT, expirationTime: null, keys: { p256dh: "cle", auth: "secret" } };
  return { endpoint: ENDPOINT, toJSON: () => json, unsubscribe: vi.fn(async () => true) };
}

type Permission = "default" | "granted" | "denied";

/** Navigateur qui prend en charge le web push, avec la permission et l'abonnement donnés. */
function navigateurPush({ permission = "default" as Permission, abonne = false, reponse = "granted" as Permission } = {}) {
  const abonnement = abonnementSimule();
  let courant: ReturnType<typeof abonnementSimule> | null = abonne ? abonnement : null;
  const pushManager = {
    getSubscription: vi.fn(async () => courant),
    subscribe: vi.fn(async () => {
      courant = abonnement;
      return abonnement;
    }),
  };
  const enregistrement = { pushManager };
  const serviceWorker = { register: vi.fn(async () => enregistrement), ready: Promise.resolve(enregistrement) };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
  vi.stubGlobal("PushManager", function PushManager() {});
  const notification = {
    permission,
    requestPermission: vi.fn(async () => {
      notification.permission = reponse;
      return reponse;
    }),
  };
  vi.stubGlobal("Notification", notification);
  return { abonnement, pushManager, serviceWorker, notification };
}

function actions({ abonner = { ok: true } as ResultatAbonnement, desabonner = { ok: true } as ResultatAbonnement } = {}) {
  return {
    abonner: vi.fn<(abonnement: unknown) => Promise<ResultatAbonnement>>(async () => abonner),
    desabonner: vi.fn<(endpoint: unknown) => Promise<ResultatAbonnement>>(async () => desabonner),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("AbonnementAppareil", () => {
  it("navigateur sans web push : explique que l'appareil ne peut pas recevoir les alertes", async () => {
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByText(/ce navigateur ne permet pas de recevoir les alertes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("web push non configuré sur le serveur : l'annonce sans proposer de bouton", async () => {
    navigateurPush();
    render(<AbonnementAppareil clePublique={null} {...actions()} />);

    expect(await screen.findByText(/pas encore disponibles/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("notifications bloquées : explique comment les autoriser", async () => {
    navigateurPush({ permission: "denied" });
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByText(/bloquées dans ce navigateur/i)).toBeInTheDocument();
    expect(screen.getByText(/réglages du site/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ne demande pas la permission avant un clic de l'utilisateur", async () => {
    const { notification, serviceWorker } = navigateurPush();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" })).toBeEnabled();
    expect(serviceWorker.register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
    expect(notification.requestPermission).not.toHaveBeenCalled();
  });

  it("abonne l'appareil après accord, puis propose de se désabonner", async () => {
    const { notification, pushManager, abonnement } = navigateurPush();
    const { abonner } = actions();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} abonner={abonner} desabonner={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" }));

    expect(notification.requestPermission).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) });
    expect(abonner).toHaveBeenCalledWith(abonnement.toJSON());
    expect(await screen.findByText("Cet appareil reçoit les alertes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se désabonner" })).toBeInTheDocument();
  });

  it("refus au moment de la demande : passe à l'état bloqué sans abonner", async () => {
    const { pushManager } = navigateurPush({ reponse: "denied" });
    const { abonner } = actions();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} abonner={abonner} desabonner={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" }));

    expect(await screen.findByText(/bloquées dans ce navigateur/i)).toBeInTheDocument();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(abonner).not.toHaveBeenCalled();
  });

  it("demande fermée sans réponse : invite à accepter et garde le bouton", async () => {
    navigateurPush({ reponse: "default" });
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/autorisez les notifications/i);
    expect(screen.getByRole("button", { name: "Recevoir les alertes sur cet appareil" })).toBeEnabled();
  });

  it("abonnement refusé par le serveur : affiche son message et retire l'abonnement du navigateur", async () => {
    const { abonnement } = navigateurPush();
    const message = "Confirmez d'abord votre adresse email pour recevoir les alertes.";
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions({ abonner: { ok: false, message } })} />);

    await userEvent.click(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(abonnement.unsubscribe).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Recevoir les alertes sur cet appareil" })).toBeInTheDocument();
  });

  it("échec de l'abonnement dans le navigateur : affiche une erreur", async () => {
    const { pushManager } = navigateurPush();
    pushManager.subscribe.mockRejectedValue(new Error("service push injoignable"));
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("L'abonnement a échoué. Réessayez plus tard.");
  });

  it("appareil déjà abonné : le réenregistre pour ce compte et propose de se désabonner", async () => {
    const { abonnement } = navigateurPush({ permission: "granted", abonne: true });
    const { abonner } = actions();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} abonner={abonner} desabonner={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Se désabonner" })).toBeInTheDocument();
    expect(abonner).toHaveBeenCalledWith(abonnement.toJSON());
  });

  it("se désabonner retire l'appareil du navigateur et du compte", async () => {
    const { abonnement } = navigateurPush({ permission: "granted", abonne: true });
    const { abonner, desabonner } = actions();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} abonner={abonner} desabonner={desabonner} />);

    await userEvent.click(await screen.findByRole("button", { name: "Se désabonner" }));

    expect(abonnement.unsubscribe).toHaveBeenCalled();
    expect(desabonner).toHaveBeenCalledWith(ENDPOINT);
    expect(await screen.findByRole("status")).toHaveTextContent("Cet appareil ne recevra plus les alertes.");
    expect(screen.getByRole("button", { name: "Recevoir les alertes sur cet appareil" })).toBeInTheDocument();
  });
});

// US-07c (#110) : sur iPhone et iPad, Apple n'autorise le web push que depuis l'écran d'accueil.
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPHONE_SAFARI_ANCIEN =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1";

/** Navigateur d'iPhone, dans un onglet ou ouvert depuis l'écran d'accueil. */
function iphone(agent: string, { installe = false } = {}) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: agent });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 5 });
  Object.defineProperty(navigator, "standalone", { configurable: true, value: installe });
  vi.stubGlobal("matchMedia", (requete: string) => ({
    matches: requete === "(display-mode: standalone)" && installe,
  }));
}

describe("AbonnementAppareil sur iPhone et iPad", () => {
  afterEach(() => {
    for (const cle of ["userAgent", "maxTouchPoints", "standalone"]) Reflect.deleteProperty(navigator, cle);
  });

  it("Safari, dans un onglet : montre les étapes pour ajouter Siklon à l'écran d'accueil", async () => {
    iphone(IPHONE_SAFARI);
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByText(/ajoutez d'abord siklon à l'écran d'accueil/i)).toBeInTheDocument();
    expect(screen.getByText("« Sur l'écran d'accueil »", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir l'aide en images" })).toHaveAttribute("href", "/compte/ecran-accueil");
    expect(screen.queryByText(/ce navigateur ne permet pas/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("Safari même si le navigateur expose le web push : les étapes restent, sans bouton d'abonnement", async () => {
    iphone(IPHONE_SAFARI);
    navigateurPush();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByText(/ajoutez d'abord siklon à l'écran d'accueil/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("iOS trop ancien : invite à mettre iOS à jour", async () => {
    iphone(IPHONE_SAFARI_ANCIEN);
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByText(/mettez à jour ios \(16\.4 ou plus récent\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("autre navigateur (Chrome) : invite à ouvrir Siklon dans Safari", async () => {
    iphone(IPHONE_CHROME);
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByText(/ouvrez siklon dans safari/i)).toBeInTheDocument();
  });

  it("ouvert depuis l'écran d'accueil : propose l'abonnement comme ailleurs", async () => {
    iphone(IPHONE_SAFARI, { installe: true });
    navigateurPush();
    render(<AbonnementAppareil clePublique={CLE_PUBLIQUE} {...actions()} />);

    expect(await screen.findByRole("button", { name: "Recevoir les alertes sur cet appareil" })).toBeInTheDocument();
    expect(screen.queryByText(/ajoutez d'abord siklon/i)).not.toBeInTheDocument();
  });
});
