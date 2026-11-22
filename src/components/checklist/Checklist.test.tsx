import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checklist, type CompteChecklist } from "./Checklist";

const guadeloupe = { nomIle: "Guadeloupe", source: "meteo-france" } as const;
const dominique = { nomIle: "Dominique", source: "nhc" } as const;

function listeEnCours() {
  return screen.getByRole("list", { name: /^Liste en cours/ });
}

describe("Checklist", () => {
  it("affiche la liste du niveau en cours, avec le délai donné par la préfecture", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={null} />);

    expect(screen.getByRole("heading", { level: 2, name: "Checklist de préparation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Vigilance orange : préparez-vous" })).toBeInTheDocument();
    expect(screen.getByText("Menace qui se précise, dans 24 à 36 heures. (Préfecture de Guadeloupe)")).toBeInTheDocument();
    expect(within(listeEnCours()).getByText("Faire le plein de carburant.")).toBeInTheDocument();
    expect(within(listeEnCours()).getAllByRole("listitem")).toHaveLength(12);
  });

  it("cite la source de chaque élément, sans répéter un même auteur", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={null} />);

    const carburant = within(listeEnCours()).getByText("Faire le plein de carburant.").closest("li")!;
    expect(
      within(carburant).getByText(
        "Source : Préfecture de Saint-Barthélemy et Saint-Martin ; Préfecture de Guadeloupe ; Croix-Rouge française (PIRAC)",
      ),
    ).toBeInTheDocument();
    for (const element of within(listeEnCours()).getAllByRole("listitem")) {
      expect(within(element).getByText(/^Source : /)).toBeInTheDocument();
    }
  });

  it("liste les documents officiels cités, avec un lien vers chacun", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={null} />);

    const sources = screen.getByRole("list", { name: "Sources de la checklist" });
    expect(within(sources).getAllByRole("link")).toHaveLength(5);
    expect(within(sources).getByRole("link", { name: /Croix-Rouge française \(PIRAC\) : Kit d'urgence/ })).toHaveAttribute(
      "href",
      "https://pirac.croix-rouge.fr/pirac-itsyourmove-kit-de-secours-fr-2",
    );
  });

  it("rappelle, repliées, les listes des niveaux précédents", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={null} />);

    const rappels = screen.getAllByText(/^Si ce n'est pas encore fait : /);
    expect(rappels.map((rappel) => rappel.textContent)).toEqual([
      "Si ce n'est pas encore fait : Avant la saison cyclonique (juin à novembre)",
      "Si ce n'est pas encore fait : Vigilance jaune : soyez attentifs",
    ]);
    for (const rappel of rappels) expect(rappel.closest("details")).not.toHaveAttribute("open");
  });

  it("n'ajoute aucun rappel sous la liste d'avant la saison", () => {
    render(<Checklist {...guadeloupe} niveau="vert" compte={null} />);

    expect(screen.getByRole("heading", { level: 3, name: "Avant la saison cyclonique (juin à novembre)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Kit d'urgence, pour tenir 72 heures" })).toBeInTheDocument();
    expect(screen.queryByText(/^Si ce n'est pas encore fait/)).not.toBeInTheDocument();
  });

  it("associe un avertissement NHC à la liste rouge et précise l'origine des consignes", () => {
    render(<Checklist {...dominique} niveau="HWR" compte={null} />);

    expect(screen.getByRole("heading", { level: 3, name: "Vigilance rouge : protégez-vous" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ces listes viennent des guides des préfectures françaises des Antilles et de la Croix-Rouge. Suivez d'abord les consignes des autorités de Dominique.",
      ),
    ).toBeInTheDocument();
  });

  it("ne précise pas l'origine des consignes pour une île française", () => {
    render(<Checklist {...guadeloupe} niveau="rouge" compte={null} />);
    expect(screen.queryByText(/Suivez d'abord les consignes des autorités/)).not.toBeInTheDocument();
  });

  it("propose toutes les listes, repliées, quand le niveau d'alerte est indisponible", () => {
    render(<Checklist {...guadeloupe} niveau={null} compte={null} />);

    expect(screen.getByText("Niveau d'alerte indisponible : choisissez la liste qui correspond aux consignes des autorités.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /^Liste en cours/ })).not.toBeInTheDocument();
    const listes = screen.getAllByText(/^(Avant la saison|Vigilance )/, { selector: "summary > span" });
    expect(listes).toHaveLength(6);
  });
});

// État complet d'un utilisateur connecté, avec des actions factices qui réussissent.
function compteComplet(etat: Partial<NonNullable<CompteChecklist>> = {}): NonNullable<CompteChecklist> {
  return {
    coches: [],
    masques: [],
    perso: [],
    cocher: vi.fn().mockResolvedValue({ ok: true }),
    cocherPerso: vi.fn().mockResolvedValue({ ok: true }),
    masquer: vi.fn().mockResolvedValue({}),
    ajouter: vi.fn().mockResolvedValue({ ajoute: true }),
    supprimer: vi.fn().mockResolvedValue({}),
    ...etat,
  };
}

describe("Checklist d'un utilisateur connecté", () => {
  const compte = (coches: string[] = [], cocher = vi.fn().mockResolvedValue({ ok: true })) => compteComplet({ coches, cocher });

  it("affiche une case à cocher par élément, dans l'état enregistré", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={compte(["orange-carburant"])} />);

    expect(within(listeEnCours()).getAllByRole("checkbox")).toHaveLength(12);
    expect(screen.getByRole("checkbox", { name: "Faire le plein de carburant." })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." })).not.toBeChecked();
    expect(screen.queryByRole("link", { name: /Connectez-vous/ })).not.toBeInTheDocument();
  });

  it("enregistre l'élément coché ou décoché", async () => {
    const cocher = vi.fn().mockResolvedValue({ ok: true });
    render(<Checklist {...guadeloupe} niveau="orange" compte={compte(["orange-carburant"], cocher)} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Faire le plein de carburant." }));

    expect(cocher).toHaveBeenNthCalledWith(1, "orange-argent", true);
    expect(cocher).toHaveBeenNthCalledWith(2, "orange-carburant", false);
    expect(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Faire le plein de carburant." })).not.toBeChecked();
  });

  it("remet la case dans son état et explique l'échec quand l'enregistrement est refusé", async () => {
    const cocher = vi.fn().mockResolvedValue({ ok: false, message: "Votre session a expiré." });
    render(<Checklist {...guadeloupe} niveau="orange" compte={compte([], cocher)} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Votre session a expiré.");
    expect(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." })).not.toBeChecked();
  });

  it("remet la case dans son état quand le serveur ne répond pas", async () => {
    const cocher = vi.fn().mockRejectedValue(new Error("réseau"));
    render(<Checklist {...guadeloupe} niveau="orange" compte={compte(["orange-argent"], cocher)} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enregistrement impossible. Vérifiez votre connexion et réessayez.");
    expect(screen.getByRole("checkbox", { name: "Retirer de l'argent liquide." })).toBeChecked();
  });
});

describe("Checklist d'un visiteur", () => {
  it("n'affiche aucune case et propose de se connecter pour enregistrer", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={null} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connectez-vous pour cocher les éléments et garder votre progression" })).toHaveAttribute(
      "href",
      "/compte/connexion",
    );
  });
});

describe("masquage des éléments de base", () => {
  it("propose de masquer chaque élément, avec un libellé qui le nomme", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet()} />);

    expect(within(listeEnCours()).getAllByRole("button", { name: /^Masquer : / })).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Masquer : Mettre les bateaux à l'abri ou les sortir de l'eau." })).toBeInTheDocument();
  });

  it("envoie l'élément à masquer", async () => {
    const masquer = vi.fn().mockResolvedValue({});
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ masquer })} />);

    await userEvent.click(screen.getByRole("button", { name: "Masquer : Mettre les bateaux à l'abri ou les sortir de l'eau." }));

    const donnees = masquer.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(donnees)).toEqual({ element: "orange-bateaux", masque: "1" });
  });

  it("retire les éléments masqués des listes et les regroupe, repliés, pour les réafficher", async () => {
    const masquer = vi.fn().mockResolvedValue({});
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ masques: ["orange-bateaux", "vert-loisirs"], masquer })} />);

    expect(within(listeEnCours()).getAllByRole("listitem")).toHaveLength(11);
    const masques = screen.getByText("Éléments masqués (2)").closest("details")!;
    expect(masques).not.toHaveAttribute("open");
    await userEvent.click(within(masques).getByRole("button", { name: "Réafficher : Jeux, livres, bloc-notes." }));

    expect(Object.fromEntries(masquer.mock.calls[0][1] as FormData)).toEqual({ element: "vert-loisirs", masque: "0" });
  });

  it("n'affiche pas la section des éléments masqués quand il n'y en a aucun", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet()} />);
    expect(screen.queryByText(/^Éléments masqués/)).not.toBeInTheDocument();
  });

  it("annonce l'échec du masquage", async () => {
    const masquer = vi.fn().mockResolvedValue({ message: "Votre session a expiré." });
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ masquer })} />);

    await userEvent.click(screen.getByRole("button", { name: "Masquer : Retirer de l'argent liquide." }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Votre session a expiré.");
  });
});

describe("éléments ajoutés par l'utilisateur", () => {
  const perso = [
    { id: "11111111-1111-1111-1111-111111111111", texte: "Croquettes du chien", coche: true },
    { id: "22222222-2222-2222-2222-222222222222", texte: "Lunettes de rechange", coche: false },
  ];

  it("affiche ses éléments, cochables, sous la liste en cours", async () => {
    const cocherPerso = vi.fn().mockResolvedValue({ ok: true });
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ perso, cocherPerso })} />);

    const liste = screen.getByRole("list", { name: "Mes éléments" });
    expect(screen.getByRole("heading", { level: 3, name: "Mes éléments" })).toBeInTheDocument();
    expect(within(liste).getByRole("checkbox", { name: "Croquettes du chien" })).toBeChecked();
    await userEvent.click(within(liste).getByRole("checkbox", { name: "Lunettes de rechange" }));
    expect(cocherPerso).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222222", true);
  });

  it("supprime un élément ajouté", async () => {
    const supprimer = vi.fn().mockResolvedValue({});
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ perso, supprimer })} />);

    await userEvent.click(screen.getByRole("button", { name: "Supprimer : Croquettes du chien" }));
    expect(Object.fromEntries(supprimer.mock.calls[0][1] as FormData)).toEqual({ id: "11111111-1111-1111-1111-111111111111" });
  });

  it("ajoute un élément avec le formulaire, limité à 200 caractères", async () => {
    const ajouter = vi.fn().mockResolvedValue({ ajoute: true });
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ ajouter })} />);

    const champ = screen.getByRole("textbox", { name: "Ajouter un élément" });
    expect(champ).toHaveAttribute("maxlength", "200");
    await userEvent.type(champ, "Croquettes du chien");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(Object.fromEntries(ajouter.mock.calls[0][1] as FormData)).toEqual({ texte: "Croquettes du chien" });
  });

  it("annonce un ajout refusé et garde la saisie", async () => {
    const ajouter = vi.fn().mockResolvedValue({ message: "Écrivez un élément de 1 à 200 caractères.", texte: "   " });
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet({ ajouter })} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Ajouter un élément" }), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Écrivez un élément de 1 à 200 caractères.");
    expect(screen.getByRole("textbox", { name: "Ajouter un élément" })).toHaveAccessibleDescription(
      "Écrivez un élément de 1 à 200 caractères.",
    );
  });

  it("indique qu'aucun élément n'a encore été ajouté", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={compteComplet()} />);
    expect(screen.getByText("Ajoutez ce qui manque pour votre foyer : il apparaîtra à chaque niveau d'alerte.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Mes éléments" })).not.toBeInTheDocument();
  });

  it("ne propose ni masquage ni ajout à un visiteur", () => {
    render(<Checklist {...guadeloupe} niveau="orange" compte={null} />);
    expect(screen.queryByRole("button", { name: /^Masquer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mes éléments" })).not.toBeInTheDocument();
  });
});
