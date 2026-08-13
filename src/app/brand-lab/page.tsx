import type { Metadata } from "next";
import Image from "next/image";
import {
  Inter,
  Manrope,
  Newsreader,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";
import styles from "./brand-lab.module.css";

export const metadata: Metadata = {
  title: "Brand language lab",
  description: "Comparaison interne des pistes typographiques et chromatiques AVI CERTIFY.",
  robots: {
    index: false,
    follow: false,
  },
};

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans-3",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif-4",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
});

const systems = [
  {
    id: "systemA",
    label: "A",
    name: "Institutional Warmth",
    typography: "Source Sans 3 + Source Serif 4",
    reading: "Institutionnel, chaleureux, posé",
    palette: [
      ["Navy", "#07142B"],
      ["Ivory", "#FCFAF5"],
      ["Green", "#08795E"],
      ["Gold", "#D8A72D"],
    ],
  },
  {
    id: "systemB",
    label: "B",
    name: "Human Digital",
    typography: "Manrope",
    reading: "Direct, calme, contemporain",
    palette: [
      ["Navy", "#0B1B35"],
      ["Ivory", "#FBF9F4"],
      ["Green", "#087E60"],
      ["Gold", "#D2AA55"],
    ],
  },
  {
    id: "systemC",
    label: "C",
    name: "Editorial International",
    typography: "Inter + Newsreader",
    reading: "International, éditorial, retenu",
    palette: [
      ["Navy", "#0F203C"],
      ["Ivory", "#F9F6F0"],
      ["Green", "#087B61"],
      ["Gold", "#C89E46"],
    ],
  },
] as const;

function Palette({ palette }: { palette: readonly (readonly [string, string])[] }) {
  return (
    <dl className={styles.palette}>
      {palette.map(([name, value]) => (
        <div key={name} className={styles.swatchItem}>
          <span className={styles.swatch} style={{ backgroundColor: value }} aria-hidden="true" />
          <div>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function BrandBoard({ system }: { system: (typeof systems)[number] }) {
  return (
    <article className={`${styles.board} ${styles[system.id]}`}>
      <header className={styles.boardHeader}>
        <p>Comparaison {system.label} — même contenu, mêmes images, mêmes actions</p>
        <div>
          <strong>{system.name}</strong>
          <span>{system.typography}</span>
        </div>
      </header>

      <div className={styles.miniNav} aria-label="Aperçu de la navigation, non interactif">
        <span className={styles.wordmark}>AVI CERTIFY</span>
        <span className={styles.navItems}>Étudier à l&apos;étranger&nbsp;&nbsp; Services&nbsp;&nbsp; À propos</span>
        <span className={styles.navAction}>Commencer</span>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Après l&apos;admission</p>
        <h1>Votre admission est là. Il faut maintenant préparer la suite.</h1>
        <p className={styles.introduction}>
          Campus France lorsque votre parcours le demande, visa, AVI, preuve de fonds, paiement des frais de scolarité et logement&nbsp;: nous vous aidons à organiser les prochaines étapes.
        </p>
        <a className={styles.primaryCta} href="/contact">
          Parler de mon dossier <span aria-hidden="true">→</span>
        </a>
        <p className={styles.microcopy}>Une question avant de vous lancer&nbsp;? Parlons-en simplement.</p>
      </section>

      <section className={styles.editorial}>
        <div className={styles.editorialCopy}>
          <p className={styles.eyebrow}>Un départ se prépare</p>
          <h2>Un projet d&apos;études, ce n&apos;est jamais juste un dossier.</h2>
          <p>
            Il y a les justificatifs, les échéances, les frais à régler et les questions qui arrivent tard. Nous vous aidons à remettre chaque pièce à sa place.
          </p>
          <a className={styles.textLink} href="/contact">Voir comment avancer <span aria-hidden="true">→</span></a>
        </div>
        <div className={styles.editorialPhoto}>
          <Image
            src="/assets/photos/student-at-university.jpg"
            alt="Étudiante à l'université"
            fill
            sizes="(max-width: 768px) 100vw, 44vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className={styles.family}>
        <div className={styles.familyPhoto}>
          <Image
            src="/assets/photos/student-meetup-avi-certify-services.png"
            alt="Étudiants et proches réunis avant un départ"
            fill
            sizes="(max-width: 768px) 100vw, 44vw"
            className="object-cover"
          />
        </div>
        <div className={styles.familyCopy}>
          <p className={styles.eyebrow}>Pour l&apos;étudiant et ses proches</p>
          <h2>Quand un étudiant part, toute une famille prépare aussi ce départ.</h2>
          <p>
            Le logement et les justificatifs qui l&apos;accompagnent se préparent eux aussi avant le départ. Prévoir les paiements et les transferts fait partie de la même histoire.
          </p>
        </div>
      </section>

      <section className={styles.closing}>
        <div>
          <p className={styles.eyebrow}>Les prochaines étapes</p>
          <h2>Les sujets importants, dans l&apos;ordre où ils arrivent.</h2>
        </div>
        <p>
          Selon votre pays et votre établissement, nous vous aidons à préparer les pièces attendues pour Campus France, le visa et la suite du dossier.
        </p>
      </section>

      <footer className={styles.boardFooter}>
        <div>
          <p className={styles.systemLabel}>Système typographique</p>
          <strong>{system.typography}</strong>
          <span>{system.reading}</span>
        </div>
        <Palette palette={system.palette} />
      </footer>
    </article>
  );
}

export default function BrandLabPage() {
  return (
    <main className={`${styles.page} ${sourceSans3.variable} ${sourceSerif4.variable} ${manrope.variable} ${inter.variable} ${newsreader.variable}`}>
      <section className={styles.intro}>
        <p className={styles.kicker}>AVI CERTIFY / Preview-only lab</p>
        <h1>Choisir une voix avant de redessiner l&apos;accueil.</h1>
        <p>
          Les trois pistes ci-dessous conservent à dessein le même texte, la même composition, les mêmes photos et la même hiérarchie d&apos;action. Seuls la couleur et le système typographique changent.
        </p>
        <div className={styles.selectionNote}>
          <span>Copie héro testée</span>
          <strong>Option B — « Votre admission est là. Il faut maintenant préparer la suite. »</strong>
          <a href="#hero-options">Voir les options A, B et C</a>
        </div>
      </section>

      <div className={styles.boards}>
        {systems.map((system) => <BrandBoard key={system.id} system={system} />)}
      </div>

      <section id="hero-options" className={styles.options}>
        <p className={styles.kicker}>Copie à sélectionner séparément</p>
        <h2>Trois débuts possibles pour l&apos;accueil.</h2>
        <div className={styles.optionGrid}>
          <article>
            <span>Option A</span>
            <h3>Partir étudier à l&apos;étranger commence bien avant le jour du départ.</h3>
          </article>
          <article>
            <span>Option B</span>
            <h3>Votre admission est là. Il faut maintenant préparer la suite.</h3>
          </article>
          <article>
            <span>Option C</span>
            <h3>Un départ pour étudier se prépare aussi en famille.</h3>
          </article>
        </div>
      </section>
    </main>
  );
}
