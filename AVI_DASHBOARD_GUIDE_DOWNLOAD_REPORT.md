# AVI DASHBOARD GUIDE DOWNLOAD REPORT

## Fichiers modifiés

- `src/app/faq/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/api/client/resources/guide-france-2026/route.ts`
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/auth/email-verification-panel.tsx`
- `src/components/dashboard/guide-resource-card.tsx`
- `src/lib/resources/guide-resource.ts`
- `src/lib/resources/guide-intent.client.ts`
- `AVI_DASHBOARD_GUIDE_DOWNLOAD_REPORT.md`

## Route API créée

- `GET /api/client/resources/guide-france-2026`

## Méthode de sécurisation

- Le client récupère un Firebase ID token depuis l'utilisateur connecté.
- La route API exige `Authorization: Bearer <idToken>`.
- Le token est vérifié côté serveur avec Firebase Admin Auth.
- L'email vérifié est requis avant téléchargement.
- Le PDF est renvoyé en réponse privée avec :
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="AVI_CERTIFY_Guide_2026_Installation_France.pdf"`
  - `Cache-Control: private, no-store`
- Aucun lien public Storage n'est exposé.
- Aucune règle Firebase Storage n'a été modifiée.

## Chemin Firebase Storage utilisé

- `marketing/guides/guide-2026-installation-france.pdf`

## Comportement CTA FAQ

- Le CTA FAQ pointe maintenant vers :
  `/inscription?resource=guide-france-2026`
- La page FAQ reste un Server Component.
- `createPageMetadata` et `JsonLd` sont conservés.
- Le bloc guide existant n'a pas été remplacé par une modal ou un formulaire lead.

## Persistance de l'intention guide

- L'intention `guide-france-2026` est lue côté client depuis l'URL.
- Elle est conservée temporairement en `sessionStorage`.
- Après connexion vérifiée ou validation email, l'utilisateur est redirigé vers :
  `/dashboard?resource=guide-france-2026`
- La logique ne crée pas de boucle de redirection.

## Comportement dashboard

- Une carte permanente `Guide 2026 – Réussir son installation en France` a été ajoutée au dashboard.
- Le bouton `Télécharger le guide` appelle la route API sécurisée.
- Si l'utilisateur arrive avec l'intention guide, la carte affiche `Votre guide est prêt` et le bouton `Télécharger maintenant`.
- Le CTA ne bloque pas la navigation et ne crée aucun overlay.

## Auto-download

- Auto-download non activé volontairement.
- Raison : les navigateurs peuvent bloquer les téléchargements automatiques non déclenchés par un geste utilisateur.
- Le bouton visible est plus fiable, plus accessible et évite les comportements intrusifs.

## Tracking Firestore

- Logging optionnel implémenté dans :
  `users/{uid}/resource_downloads/guide_france_2026`
- Champs enregistrés :
  - `uid`
  - `email`
  - `resourceId`
  - `downloadedAt`
  - `userAgent`
- Un échec de logging est journalisé mais ne bloque pas le téléchargement.

## Tests exécutés

- `npm run lint` : OK
- `npm run build` : OK

## Limites

- Le téléchargement réel depuis Firebase Storage nécessite un utilisateur Firebase authentifié et email vérifié.
- La présence du fichier Storage `marketing/guides/guide-2026-installation-france.pdf` est supposée conforme au contexte fourni.
- Aucun test manuel navigateur authentifié n'a été exécuté dans cette passe.

## Hors périmètre confirmé

- Aucun déploiement production.
- Aucun `git add`, commit ou push.
- Aucun changement `/admin`, `/prix`, middleware admin, Resend, Firebase rules, Storage rules ou système lead magnet rollbacké.
