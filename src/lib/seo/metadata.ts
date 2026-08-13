import type { Metadata } from "next";

const developmentUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const siteConfig = {
  name: "AVI CERTIFY",
  url:
    process.env.NODE_ENV === "development"
      ? developmentUrl
      : "https://www.avicertify.fr",
  locale: "fr_FR",
  title: "AVI CERTIFY | AVI étudiant, visa et dossier financier",
  description:
    "AVI CERTIFY accompagne les étudiants dans la préparation de leur AVI, attestation d'hébergement, préfinancement et dossier de visa étudiant.",
  keywords: [
    "AVI étudiant",
    "attestation de virement irrévocable",
    "visa étudiant",
    "accompagnement visa étudiant",
    "attestation d'hébergement",
    "préfinancement étudiant",
    "suivi de dossier étudiant",
  ],
};

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export function getAbsoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${siteConfig.url}${normalizedPath}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    keywords: keywords ?? siteConfig.keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | ${siteConfig.name}`,
      description,
    },
  };
}

export const defaultRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export const privateRouteMetadata: Metadata = {
  alternates: {
    canonical: null,
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
    },
  },
};
