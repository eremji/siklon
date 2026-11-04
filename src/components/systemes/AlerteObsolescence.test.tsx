import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlerteObsolescence } from "./AlerteObsolescence";

const emisLe = "2026-09-10T15:00:00.000Z";
const MESSAGE = /Données possiblement obsolètes/;

describe("AlerteObsolescence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ne dit rien tant que l'avis a moins de 6 h", () => {
    vi.setSystemTime(new Date("2026-09-10T20:00:00.000Z"));
    render(<AlerteObsolescence emisLe={emisLe} />);

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("avertit quand l'avis a plus de 6 h", () => {
    vi.setSystemTime(new Date("2026-09-10T21:30:00.000Z"));
    render(<AlerteObsolescence emisLe={emisLe} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h.",
    );
  });

  it("apparaît sur une page restée ouverte quand le seuil est franchi", () => {
    vi.setSystemTime(new Date("2026-09-10T20:58:00.000Z"));
    render(<AlerteObsolescence emisLe={emisLe} />);
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4 * 60_000);
    });

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });
});
