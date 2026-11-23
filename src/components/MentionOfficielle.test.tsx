import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { MentionOfficielle } from "./MentionOfficielle";

describe("MentionOfficielle", () => {
  it("rappelle les consignes officielles dans la langue de la page", () => {
    render(
      <FournisseurLangue langue="en">
        <MentionOfficielle />
      </FournisseurLangue>,
    );
    expect(screen.getByText("Siklon does not replace official instructions. Follow local authorities.")).toBeInTheDocument();
  });

  it("est en français par défaut, avec la mise en forme de bas de page", () => {
    render(<MentionOfficielle />);
    const mention = screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.");
    expect(mention).toHaveClass("mt-auto", "text-sm", "text-muted");
  });

  it("accepte une autre mise en forme", () => {
    render(<MentionOfficielle className="autre" />);
    expect(screen.getByText(/^Siklon ne remplace pas/)).toHaveAttribute("class", "autre");
  });
});
