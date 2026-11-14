import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les polices du compte rendu PDF (les nôtres et celles de base de pdfkit) sont lues sur le disque :
  // on les joint à la fonction serveur.
  outputFileTracingIncludes: {
    "/chantiers/[id]/rapport/pdf": ["./assets/fonts/**", "./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"],
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
