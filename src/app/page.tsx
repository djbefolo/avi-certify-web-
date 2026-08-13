import { HomepageConversionV2 } from "@/components/marketing/homepage-conversion-v2";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Accompagnement étudiant, visa et mobilité internationale",
  description:
    "AVI CERTIFY accompagne les étudiants et leurs familles pour structurer leur projet d'études, de financement, de visa et d'installation.",
  path: "/",
});

export default function HomePage() {
  return <HomepageConversionV2 />;
}
