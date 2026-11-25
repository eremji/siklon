import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const SITE = "https://siklon.example";

function requete(chemin: string, { navigateur, cookie }: { navigateur?: string; cookie?: string } = {}) {
  const entetes = new Headers();
  if (navigateur) entetes.set("accept-language", navigateur);
  if (cookie) entetes.set("cookie", `siklon-langue=${cookie}`);
  return new NextRequest(`${SITE}${chemin}`, { headers: entetes });
}

describe("proxy : adresse sans langue", () => {
  it("redirige vers la langue du navigateur en gardant le chemin et les paramètres", () => {
    const reponse = proxy(requete("/iles/guadeloupe/historique?categorie=3", { navigateur: "en-US,en;q=0.9" }));
    expect(reponse.status).toBe(307);
    expect(getRedirectUrl(reponse)).toBe(`${SITE}/en/iles/guadeloupe/historique?categorie=3`);
  });

  it("redirige l'accueil vers l'accueil de la langue", () => {
    expect(getRedirectUrl(proxy(requete("/", { navigateur: "fr-FR" })))).toBe(`${SITE}/fr`);
  });

  it("prend le français quand le navigateur ne propose ni français ni anglais", () => {
    expect(getRedirectUrl(proxy(requete("/compte", { navigateur: "de-DE" })))).toBe(`${SITE}/fr/compte`);
    expect(getRedirectUrl(proxy(requete("/compte")))).toBe(`${SITE}/fr/compte`);
  });

  it("donne la priorité à la langue choisie, gardée dans le cookie", () => {
    expect(getRedirectUrl(proxy(requete("/iles", { navigateur: "fr-FR", cookie: "en" })))).toBe(`${SITE}/en/iles`);
  });

  it("ignore un cookie qui ne contient pas une langue de l'app", () => {
    expect(getRedirectUrl(proxy(requete("/iles", { navigateur: "en", cookie: "es" })))).toBe(`${SITE}/en/iles`);
  });

  it("ne met pas de cache partagé sur la redirection, qui dépend du visiteur", () => {
    const reponse = proxy(requete("/", { navigateur: "en" }));
    expect(reponse.headers.get("vary")).toMatch(/accept-language/i);
    expect(reponse.headers.get("vary")).toMatch(/cookie/i);
  });
});

describe("proxy : chemins concernés", () => {
  const passe = (url: string) => unstable_doesMiddlewareMatch({ config, url });

  it("traite les adresses de pages sans langue", () => {
    expect(passe("/")).toBe(true);
    expect(passe("/iles/guadeloupe")).toBe(true);
    expect(passe("/compte/confirmer?token=abc")).toBe(true);
    expect(passe("/systemes/al092026")).toBe(true);
    expect(passe("/english")).toBe(true);
    expect(passe("/apiculture")).toBe(true);
  });

  it("laisse passer sans traitement les pages qui ont déjà leur langue", () => {
    expect(passe("/fr")).toBe(false);
    expect(passe("/en/iles/guadeloupe")).toBe(false);
  });

  it("ne touche ni l'API, ni les fichiers de Next, ni les fichiers statiques", () => {
    expect(passe("/api/auth/callback/google")).toBe(false);
    expect(passe("/api/alertes/verifier")).toBe(false);
    expect(passe("/_next/static/chunks/app.js")).toBe(false);
    expect(passe("/sw.js")).toBe(false);
    expect(passe("/favicon.ico")).toBe(false);
    expect(passe("/icon.svg")).toBe(false);
  });

  it("ne touche pas aux fichiers de l'application installée (US-07b), même sans extension", () => {
    expect(passe("/manifest.webmanifest")).toBe(false);
    expect(passe("/icones/192.png")).toBe(false);
    // Next sert l'icône Apple générée (src/app/apple-icon.tsx) à /apple-icon?<empreinte>.
    expect(passe("/apple-icon")).toBe(false);
    expect(passe("/apple-icon?c3a1f0b2")).toBe(false);
    expect(passe("/apple-iconographie")).toBe(true);
  });
});
