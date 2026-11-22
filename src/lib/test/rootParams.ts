// Remplaçant de next/root-params dans Vitest : le vrai module n'existe qu'une fois compilé par Next.js.
// Les tests qui veulent une autre langue le simulent avec vi.mock("next/root-params").
export const langue = async (): Promise<string> => "fr";
