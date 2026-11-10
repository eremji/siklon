// En-têtes HTTP de sécurité envoyés avec chaque réponse (branchés dans next.config.ts).
//
// CSP sans nonce : une CSP à nonce impose le rendu dynamique de chaque page et est incompatible
// avec le prérendu partiel (cacheComponents) de Siklon. 'unsafe-inline' reste donc nécessaire
// pour les scripts et styles injectés par Next.js et MapLibre ; la CSP interdit en revanche tout
// script, connexion ou cadre venant d'un autre domaine que ceux listés ici.

// Fond de carte (src/lib/carte/style.ts) : seul domaine tiers contacté par le navigateur.
const TUILES = "https://tiles.openfreemap.org";

export function politiqueContenu({ dev }: { dev: boolean }): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    // En développement, React utilise eval pour reconstruire les piles d'erreurs du serveur.
    ["script-src", "'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'"],
    ["connect-src", "'self'", TUILES],
    // MapLibre 6 charge son worker depuis le site (maplibre-gl-worker.mjs) ; il ne passe par
    // une URL blob: que si ses fichiers viennent d'un autre domaine, ce qui n'est pas le cas.
    ["worker-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["upgrade-insecure-requests"],
  ];
  return directives.map((d) => d.join(" ")).join("; ");
}

export function entetesSecurite({ dev }: { dev: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: politiqueContenu({ dev }) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Doublon de frame-ancestors pour les navigateurs qui ignorent la CSP.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
