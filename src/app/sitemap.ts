import type { MetadataRoute } from "next";
import { services } from "@/constants/services";
import { getAbsoluteUrl } from "@/lib/seo/metadata";

const publicRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/a-propos", changeFrequency: "monthly", priority: 0.6 },
  { path: "/comment-ca-marche", changeFrequency: "monthly", priority: 0.8 },
  { path: "/connexion", changeFrequency: "yearly", priority: 0.3 },
  { path: "/inscription", changeFrequency: "yearly", priority: 0.4 },
  {
    path: "/mot-de-passe-oublie",
    changeFrequency: "yearly",
    priority: 0.2,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const serviceRoutes = services.map((service) => ({
    path: service.href,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [...publicRoutes, ...serviceRoutes].map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

