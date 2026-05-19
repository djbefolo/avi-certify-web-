import type { Service } from "@/constants/services";
import { getAbsoluteUrl, siteConfig } from "@/lib/seo/metadata";

type FaqItem = {
  question: string;
  answer: string;
};

const organizationId = `${getAbsoluteUrl("/")}#organization`;
const websiteId = `${getAbsoluteUrl("/")}#website`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: siteConfig.name,
    url: getAbsoluteUrl("/"),
    description: siteConfig.description,
    email: "contact@avicertify.com",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: siteConfig.name,
    url: getAbsoluteUrl("/"),
    inLanguage: "fr-FR",
    publisher: {
      "@id": organizationId,
    },
  };
}

export function faqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function serviceJsonLd(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${getAbsoluteUrl(service.href)}#service`,
    name: service.title,
    serviceType: service.kicker,
    description: service.description,
    url: getAbsoluteUrl(service.href),
    provider: {
      "@id": organizationId,
    },
    category: "Accompagnement étudiant international",
  };
}

