# AVI PUBLIC MICRO FIX REPORT

## Source exacte du rond noir `N`

- Source identifiée : indicateur de développement Next.js 15.
- Configuration par défaut trouvée dans les types Next.js : `devIndicators.position = "bottom-left"`.
- Ce n'était pas un ancien floating CTA, pas le CTA WhatsApp, pas un widget guide et pas un overlay applicatif.

## Correction appliquée

- `next.config.ts` : ajout de `devIndicators: false`.
- Effet attendu : suppression du rond noir `N` en environnement de preview/dev.
- Aucun changement sur le CTA WhatsApp `Nous contacter`.
- Aucun changement sur la navigation ou le bloc guide FAQ.

## LinkedIn

- Footer vérifié dans `src/components/layout/footer.tsx`.
- Lien LinkedIn actif :
  `https://www.linkedin.com/company/avi-certify/`
- Ouverture en nouvel onglet avec `target="_blank"` et `rel="noopener noreferrer"`.
- Section `Suivez-nous` de la homepage également corrigée dans `src/app/page.tsx` pour retirer le bouton LinkedIn désactivé restant.
- Facebook et Instagram non modifiés.

## Tests exécutés

- `npm run lint` : OK
- `npm run build` : OK

## Backend

- Aucune modification backend.
- Aucun changement Firebase, Storage, Resend, admin, prix, dashboard, middleware, auth ou API routes.

## Déploiement et Git

- Aucun déploiement production.
- Aucun `git add`, commit ou push.
