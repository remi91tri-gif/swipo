import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les polices du compte rendu PDF (les nôtres et celles de base de pdfkit) sont lues sur le disque :
  // on les joint à la fonction serveur.
  outputFileTracingIncludes: {
    "/chantiers/[id]/rapport/pdf": ["./assets/fonts/**", "./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"],
  },
  serverExternalPackages: ["@react-pdf/renderer", "nodemailer"],
  // Protections du navigateur : pas d'affichage de Swipo dans une autre page (hameçonnage),
  // les liens d'invitation ne fuitent pas vers d'autres sites, HTTPS obligatoire.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      // Les pages d'invitation ne transmettent jamais leur adresse (qui contient le lien secret).
      { source: "/rejoindre/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
