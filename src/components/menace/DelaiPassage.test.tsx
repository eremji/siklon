import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DelaiPassage } from "./DelaiPassage";

describe("DelaiPassage", () => {
  afterEach(() => vi.useRealTimers());

  it("affiche le délai avant le passage estimé, calculé à l'heure du visiteur", () => {
    vi.useFakeTimers({ now: new Date("2026-09-10T19:00:00.000Z") });

    render(<DelaiPassage heure="2026-09-11T07:15:00.000Z" />);

    expect(screen.getByText("Dans environ 12 h")).toBeInTheDocument();
  });

  it("se met à jour quand le temps passe", () => {
    vi.useFakeTimers({ now: new Date("2026-09-10T19:00:00.000Z") });
    render(<DelaiPassage heure="2026-09-11T07:15:00.000Z" />);

    act(() => vi.advanceTimersByTime(2 * 3_600_000));

    expect(screen.getByText("Dans environ 10 h")).toBeInTheDocument();
  });
});
