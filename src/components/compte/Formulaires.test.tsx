import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { ILES } from "@/lib/iles";

const parametres = vi.hoisted(() => ({ valeur: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => parametres.valeur }));

import {
  AlerteGoogle,
  FormulaireAlertesEmail,
  FormulaireConfirmationAdresse,
  FormulaireConnexion,
  FormulaireGoogle,
  FormulaireIles,
  FormulaireInscription,
  FormulaireMotDePasseOublie,
  FormulaireNouveauMotDePasse,
  FormulaireRenvoiConfirmation,
  FormulaireSuppression,
} from "./Formulaires";

type Etat = { message?: string; confirmation?: string; email?: string };
const actionQuiRepond = (reponse: Etat) => vi.fn<(etat: Etat, donnees: FormData) => Promise<Etat>>(async () => reponse);

describe("FormulaireInscription", () => {
  it("demande un email, un mot de passe d'au moins 12 caractères et une langue", () => {
    render(<FormulaireInscription action={vi.fn()} />);

    const email = screen.getByLabelText("Adresse email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toBeRequired();

    const motDePasse = screen.getByLabelText("Mot de passe");
    expect(motDePasse).toHaveAttribute("type", "password");
    expect(motDePasse).toHaveAttribute("autocomplete", "new-password");
    expect(motDePasse).toHaveAttribute("minlength", "12");
    expect(motDePasse).toHaveAccessibleDescription("Au moins 12 caractères.");
    expect(motDePasse).toBeRequired();

    const langue = screen.getByRole("group", { name: "Langue des messages" });
    expect(langue).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Français" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "English" })).not.toBeChecked();
  });

  it("envoie le formulaire, puis affiche l'erreur et garde l'email saisi", async () => {
    const action = vi.fn<(etat: object, donnees: FormData) => Promise<{ message: string; email: string }>>(async () => ({
      message: "Un compte existe déjà avec cette adresse email.",
      email: "a@b.fr",
    }));
    render(<FormulaireInscription action={action} />);

    await userEvent.type(screen.getByLabelText("Adresse email"), "a@b.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "un mot de passe solide");
    await userEvent.click(screen.getByRole("radio", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Un compte existe déjà avec cette adresse email.");
    expect(screen.getByLabelText("Adresse email")).toHaveValue("a@b.fr");
    const donnees = action.mock.calls[0][1];
    expect(Object.fromEntries(donnees)).toEqual({
      langueInterface: "fr",
      email: "a@b.fr",
      motDePasse: "un mot de passe solide",
      langue: "en",
    });
  });
});

it("les deux formulaires n'ont aucun identifiant en commun, même affichés ensemble", () => {
  const { container } = render(
    <>
      <FormulaireInscription action={vi.fn()} />
      <FormulaireConnexion action={vi.fn()} />
    </>,
  );
  const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe("FormulaireConnexion", () => {
  it("demande un email et le mot de passe actuel", () => {
    render(<FormulaireConnexion action={vi.fn()} />);
    expect(screen.getByLabelText("Adresse email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    const action = vi.fn(async () => ({ message: "Email ou mot de passe incorrect.", email: "a@b.fr" }));
    render(<FormulaireConnexion action={action} />);

    await userEvent.type(screen.getByLabelText("Adresse email"), "a@b.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mauvais mot de passe");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
  });
});

describe("FormulaireSuppression", () => {
  it("demande le mot de passe pour confirmer et dit ce qui sera effacé", () => {
    render(<FormulaireSuppression action={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Supprimer mon compte" })).toBeInTheDocument();
    expect(screen.getByText(/toutes ses données/i)).toHaveTextContent(/îles suivies, appareils abonnés aux alertes/);
    expect(screen.getByText(/La suppression est définitive/)).toBeInTheDocument();
    const motDePasse = screen.getByLabelText("Mot de passe actuel");
    expect(motDePasse).toHaveAttribute("type", "password");
    expect(motDePasse).toHaveAttribute("autocomplete", "current-password");
    expect(motDePasse).toBeRequired();
    expect(screen.getByRole("button", { name: "Supprimer définitivement mon compte" })).toBeInTheDocument();
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    const action = vi.fn(async () => ({ message: "Mot de passe incorrect." }));
    render(<FormulaireSuppression action={action} />);
    await userEvent.type(screen.getByLabelText("Mot de passe actuel"), "faux mot de passe");
    await userEvent.click(screen.getByRole("button", { name: "Supprimer définitivement mon compte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mot de passe incorrect.");
  });
});

describe("FormulaireSuppression d'un compte Google sans mot de passe", () => {
  it("ne demande pas de mot de passe, mais une connexion récente avec Google", async () => {
    const action = vi.fn(async () => ({}));
    render(<FormulaireSuppression action={action} motDePasse={false} google={vi.fn()} />);
    expect(screen.queryByLabelText("Mot de passe actuel")).not.toBeInTheDocument();
    expect(screen.getByText(/reconnectez-vous avec Google/)).toHaveTextContent(/10 minutes/);
    expect(screen.getByRole("button", { name: "Me reconnecter avec Google" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Supprimer définitivement mon compte" }));
    expect(action).toHaveBeenCalled();
  });
});

describe("AlerteGoogle", () => {
  it("affiche le message de l'erreur reçue au retour de Google", () => {
    parametres.valeur = new URLSearchParams("error=account_not_linked");
    render(<AlerteGoogle />);
    expect(screen.getByRole("alert")).toHaveTextContent(/n'est pas confirmée/);
  });

  it("n'affiche rien sans erreur", () => {
    parametres.valeur = new URLSearchParams();
    render(<AlerteGoogle />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("FormulaireGoogle", () => {
  it("envoie la page de départ, pour y revenir en cas d'échec", async () => {
    const action = vi.fn<(donnees: FormData) => Promise<void>>(async () => {});
    render(<FormulaireGoogle action={action} origine="/compte/connexion" />);
    await userEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));
    await vi.waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][0].get("origine")).toBe("/compte/connexion");
  });
});

describe("FormulaireInscription avec Google", () => {
  it("part chez Google avec la langue cochée, sans exiger l'email ni le mot de passe", async () => {
    const google = vi.fn<(donnees: FormData) => Promise<void>>(async () => {});
    const action = actionQuiRepond({});
    render(<FormulaireInscription action={action} google={google} />);
    await userEvent.click(screen.getByRole("radio", { name: "English" }));
    const bouton = screen.getByRole("button", { name: "S'inscrire avec Google" });
    // jsdom ignore formnovalidate (vérifié en e2e dans un vrai navigateur) : on remplit les champs ici.
    expect(bouton).toHaveAttribute("formnovalidate");
    await userEvent.type(screen.getByLabelText("Adresse email"), "a@b.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "un mot de passe solide");
    await userEvent.click(bouton);
    await vi.waitFor(() => expect(google).toHaveBeenCalled());
    expect(action).not.toHaveBeenCalled();
    const donnees = google.mock.calls[0][0];
    expect(donnees.get("langue")).toBe("en");
    expect(donnees.get("origine")).toBe("/compte/inscription");
  });

  it("sans Google configuré, ne montre pas le bouton", () => {
    render(<FormulaireInscription action={actionQuiRepond({})} />);
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  });
});

describe("FormulaireIles", () => {
  it("propose toutes les îles à cocher, celles déjà suivies cochées", () => {
    render(<FormulaireIles action={vi.fn()} suivies={["martinique"]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Mes îles" })).toBeInTheDocument();
    const groupe = screen.getByRole("group", { name: "Îles suivies" });
    expect(groupe).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(ILES.length);
    expect(screen.getByRole("checkbox", { name: "Martinique" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Guadeloupe" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Enregistrer mes îles" })).toBeInTheDocument();
  });

  it("envoie les îles cochées, puis confirme et coche celles enregistrées", async () => {
    const action = vi.fn<(etat: object, donnees: FormData) => Promise<object>>(async () => ({
      confirmation: "Vos îles sont enregistrées.",
      iles: ["guadeloupe"],
    }));
    render(<FormulaireIles action={action} suivies={["martinique"]} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Guadeloupe" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Martinique" }));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer mes îles" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Vos îles sont enregistrées.");
    expect(action.mock.calls[0][1].getAll("ile")).toEqual(["guadeloupe"]);
    expect(screen.getByRole("checkbox", { name: "Guadeloupe" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Martinique" })).not.toBeChecked();
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    const action = vi.fn(async () => ({ message: "Votre session a expiré. Reconnectez-vous pour enregistrer vos îles." }));
    render(<FormulaireIles action={action} suivies={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer mes îles" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Votre session a expiré.");
  });
});

describe("FormulaireAlertesEmail", () => {
  type EtatAlertes = { message?: string; confirmation?: string; accord?: boolean };

  it("propose de recevoir les alertes à l'adresse du compte, case décochée par défaut", () => {
    render(<FormulaireAlertesEmail action={vi.fn()} accord={false} email="a@b.fr" />);
    expect(screen.getByRole("heading", { level: 2, name: "Alertes par e-mail" })).toBeInTheDocument();
    expect(screen.getByText(/a@b\.fr/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Recevoir les alertes par e-mail" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
  });

  it("coche la case si l'accord est déjà donné", () => {
    render(<FormulaireAlertesEmail action={vi.fn()} accord email="a@b.fr" />);
    expect(screen.getByRole("checkbox", { name: "Recevoir les alertes par e-mail" })).toBeChecked();
  });

  it("envoie le choix, puis confirme et garde la case dans l'état enregistré", async () => {
    const action = vi.fn<(etat: EtatAlertes, donnees: FormData) => Promise<EtatAlertes>>(async () => ({
      confirmation: "Vous recevrez les alertes par e-mail.",
      accord: true,
    }));
    render(<FormulaireAlertesEmail action={action} accord={false} email="a@b.fr" />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Recevoir les alertes par e-mail" }));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Vous recevrez les alertes par e-mail.");
    expect(action.mock.calls[0][1].get("email")).toBe("oui");
    expect(screen.getByRole("checkbox", { name: "Recevoir les alertes par e-mail" })).toBeChecked();
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    const action = vi.fn(async () => ({ message: "Votre session a expiré. Reconnectez-vous pour gérer vos alertes." }));
    render(<FormulaireAlertesEmail action={action} accord={false} email="a@b.fr" />);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Votre session a expiré.");
  });
});

describe("FormulaireConfirmationAdresse", () => {
  it("confirme d'un clic avec le jeton du lien, puis mène au compte", async () => {
    const action = actionQuiRepond({ confirmation: "Votre adresse est confirmée." });
    render(<FormulaireConfirmationAdresse action={action} jeton="jeton-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer mon adresse" }));

    expect(action.mock.calls[0][1].get("jeton")).toBe("jeton-1");
    expect(await screen.findByRole("status")).toHaveTextContent("Votre adresse est confirmée.");
    expect(screen.getByRole("link", { name: "Aller à mon compte" })).toHaveAttribute("href", "/fr/compte");
    expect(screen.queryByRole("button", { name: "Confirmer mon adresse" })).not.toBeInTheDocument();
  });

  it("affiche l'erreur d'un lien expiré", async () => {
    render(<FormulaireConfirmationAdresse action={actionQuiRepond({ message: "Ce lien a expiré. Demandez-en un nouveau." })} jeton="x" />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer mon adresse" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce lien a expiré.");
  });
});

describe("FormulaireRenvoiConfirmation", () => {
  it("renvoie le lien et confirme l'envoi", async () => {
    render(<FormulaireRenvoiConfirmation action={actionQuiRepond({ confirmation: "Un nouveau lien vient d'être envoyé à a@b.fr." })} />);
    await userEvent.click(screen.getByRole("button", { name: "Renvoyer le lien de confirmation" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Un nouveau lien vient d'être envoyé à a@b.fr.");
  });
});

describe("FormulaireMotDePasseOublie", () => {
  it("demande l'adresse, puis confirme l'envoi à la place du formulaire", async () => {
    const action = actionQuiRepond({ confirmation: "Si un compte existe avec cette adresse, un lien vient de lui être envoyé." });
    render(<FormulaireMotDePasseOublie action={action} />);
    await userEvent.type(screen.getByLabelText("Adresse email"), "a@b.fr");
    await userEvent.click(screen.getByRole("button", { name: "Recevoir un lien" }));

    expect(action.mock.calls[0][1].get("email")).toBe("a@b.fr");
    expect(await screen.findByRole("status")).toHaveTextContent("Si un compte existe");
    expect(screen.queryByLabelText("Adresse email")).not.toBeInTheDocument();
  });
});

describe("FormulaireNouveauMotDePasse", () => {
  it("demande un nouveau mot de passe d'au moins 12 caractères, avec le jeton du lien", async () => {
    const action = actionQuiRepond({ confirmation: "Votre mot de passe est changé. Connectez-vous avec le nouveau." });
    render(<FormulaireNouveauMotDePasse action={action} jeton="jeton-1" />);

    const champ = screen.getByLabelText("Nouveau mot de passe");
    expect(champ).toHaveAttribute("autocomplete", "new-password");
    expect(champ).toHaveAttribute("minlength", "12");
    await userEvent.type(champ, "un tout nouveau mot de passe");
    await userEvent.click(screen.getByRole("button", { name: "Changer mon mot de passe" }));

    const donnees = action.mock.calls[0][1];
    expect(donnees.get("jeton")).toBe("jeton-1");
    expect(donnees.get("motDePasse")).toBe("un tout nouveau mot de passe");
    expect(await screen.findByRole("status")).toHaveTextContent("Votre mot de passe est changé.");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/fr/compte/connexion");
  });

  it("propose un nouveau lien quand celui-ci ne marche plus", async () => {
    render(
      <FormulaireNouveauMotDePasse
        action={actionQuiRepond({ message: "Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau." })}
        jeton="x"
      />,
    );
    await userEvent.type(screen.getByLabelText("Nouveau mot de passe"), "un tout nouveau mot de passe");
    await userEvent.click(screen.getByRole("button", { name: "Changer mon mot de passe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demandez-en un nouveau.");
    expect(screen.getByRole("link", { name: "Demander un nouveau lien" })).toHaveAttribute(
      "href",
      "/fr/compte/mot-de-passe-oublie",
    );
  });
});

describe("Langue de la page transmise aux actions qui redirigent", () => {
  // Les server actions ne lisent pas l'adresse de la page : la langue part avec le formulaire.
  const champLangue = (formulaire: HTMLElement) =>
    formulaire.querySelector<HTMLInputElement>('input[type="hidden"][name="langueInterface"]')?.value;

  it.each([
    ["inscription", <FormulaireInscription key="i" action={vi.fn()} google={vi.fn()} />],
    ["connexion", <FormulaireConnexion key="c" action={vi.fn()} />],
    ["Google", <FormulaireGoogle key="g" action={vi.fn()} origine="/compte/connexion" />],
    ["suppression", <FormulaireSuppression key="s" action={vi.fn()} />],
  ])("formulaire de %s", (_nom, formulaire) => {
    const { container } = render(<FournisseurLangue langue="en">{formulaire}</FournisseurLangue>);
    const formulaires = [...container.querySelectorAll("form")];
    expect(formulaires.length).toBeGreaterThan(0);
    for (const element of formulaires) expect(champLangue(element)).toBe("en");
  });
});
