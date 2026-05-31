# AVI REGISTER PREMIUM PROFILE UPGRADE REPORT

## Fichiers modifiés

- `src/components/auth/register-form.tsx`
- `src/lib/validations/auth.ts`
- `src/app/api/users/create-profile/route.ts`
- `src/lib/server/users.service.ts`
- `src/lib/profile/countries.ts`
- `AVI_REGISTER_PREMIUM_PROFILE_UPGRADE_REPORT.md`

## Validations ajoutées

- `firstName` requis, 2 à 60 caractères.
- `lastName` requis, 2 à 60 caractères.
- `birthDate` requis, format ISO `YYYY-MM-DD`, date passée uniquement.
- `birthCountry` requis et validé contre une liste pays standard.
- `phone` conservé optionnel, 24 caractères maximum.
- Mot de passe fort requis :
  - 8 caractères minimum
  - 1 majuscule
  - 1 minuscule
  - 1 chiffre
  - 1 caractère spécial
- Checklist UX de mot de passe ajoutée dans le formulaire.

## Composant date picker utilisé

- Date picker natif navigateur : `<input type="date">`.
- Ajout d'une icône calendrier et limite `max` à la date du jour.
- Choix retenu pour rester mobile-friendly, accessible, fiable et sans nouvelle dépendance.

## Stockage Firestore

Le profil `users/{uid}` est enrichi avec :

- `firstName`
- `lastName`
- `fullName` conservé et dérivé côté serveur pour compatibilité existante
- `birthDate`
- `birthCountry`
- `dateOfBirth` conservé comme alias compatible avec les modules profil/certificat existants
- `phone`
- `email`
- `createdAt`
- `updatedAt`

## UX inscription

- Le champ `Nom complet` est remplacé par `Prénom` et `Nom`.
- Le téléphone devient clairement `Téléphone WhatsApp (optionnel)`.
- Micro-copy ajoutée : `Utile pour un accompagnement plus rapide.`
- Sélecteur pays ajouté avec une liste contrôlée, sans champ libre.
- Le flow Firebase Auth et email verification reste inchangé.

## Tests exécutés

- `npm run lint` : OK
- `npm run build` : OK

## Limites

- Aucun test manuel navigateur authentifié n'a été exécuté dans cette passe.
- Le date picker dépend du rendu natif du navigateur, volontairement choisi pour éviter une nouvelle dépendance UI.
- La liste pays est une première liste standard ciblée et pourra être étendue sans modifier le modèle.

## Confirmations de non-régression

- Login non modifié dans cette intervention.
- Flow email verification conservé.
- Téléchargement guide non modifié.
- Aucun changement `/admin`, `/prix`, dashboard, middleware admin, Resend, Firebase rules ou système auth core.
- Aucun déploiement production.
- Aucun `git add`, commit ou push.
