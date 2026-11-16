import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/inscription", 0.8, "monthly"),
    page("/connexion", 0.5, "yearly"),
    page("/mentions-legales", 0.2, "yearly"),
    page("/conditions", 0.2, "yearly"),
    page("/confidentialite", 0.2, "yearly"),
  ];
}
