import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les polices du compte rendu PDF sont lues sur le disque : on les joint à la fonction serveur.
  outputFileTracingIncludes: { "/chantiers/[id]/rapport/pdf": ["./assets/fonts/**"] },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
