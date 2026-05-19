import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/dashboard/",
        "/dossier",
        "/dossier/",
        "/profil",
        "/profil/",
        "/api",
        "/api/",
      ],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
