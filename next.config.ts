import type { NextConfig } from "next";
import { entetesSecurite } from "./src/lib/securite/entetes";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Ne pas annoncer le framework utilisé.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: entetesSecurite({ dev: process.env.NODE_ENV === "development" }) }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
