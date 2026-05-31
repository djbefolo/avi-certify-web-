# AVI GUIDE SIMPLE FAQ INTEGRATION REPORT

## Fichiers modifiés

- `src/app/page.tsx`
- `src/app/faq/page.tsx`
- `src/components/layout/footer.tsx`
- `AVI_GUIDE_SIMPLE_FAQ_INTEGRATION_REPORT.md`

## Homepage

- Badge visuel `Dossiers traités / Accompagnement vérifié` supprimé du hero.
- Photo, textes principaux et CTA `Commencer mon dossier` / `Parler à un conseiller` conservés.
- Aucun overlay guide, modal ou CTA flottant ajouté.

## FAQ

- La page FAQ reste un Server Component.
- `createPageMetadata` et `JsonLd` sont conservés.
- Bloc guide premium ajouté sous le `PageHeader`, avant les questions FAQ.
- Question FAQ ajoutée : `Comment recevoir le guide gratuit AVI CERTIFY ?`

## Route d'inscription utilisée

- CTA guide : `/inscription`

## Footer LinkedIn

- Le lien LinkedIn de la section `Suivez-nous` pointe vers :
  `https://www.linkedin.com/company/avi-certify/`
- Ouverture en nouvel onglet avec `target="_blank"` et `rel="noopener noreferrer"`.
- Les autres réseaux sociaux n'ont pas été modifiés.

## Tests exécutés

- `npm run lint` : OK
- `npm run build` : OK

## Limites

- Preview uniquement.
- Aucun déploiement production.
- Aucun `git add`, commit ou push.
- Aucune capture automatisée ajoutée dans ce correctif.

## Backend

- Aucune modification backend.
- Aucun changement Firebase, Storage, Resend, Auth, middleware, dashboard, admin, prix ou API routes.
