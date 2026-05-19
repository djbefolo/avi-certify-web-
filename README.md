# AVI CERTIFY Web Platform

Plateforme web professionnelle pour l'accompagnement étudiant : AVI, attestation d'hebergement, prefinancement, accompagnement visa, espace client, documents, paiement et futur CRM.

## Stack

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Firebase Auth, Firestore et Storage
- React Hook Form + Zod
- Framer Motion
- Resend
- Stripe
- PostHog
- Vercel

## Demarrage local

```bash
npm.cmd install
npm.cmd run verify
npm.cmd run dev
```

Copier `.env.example` vers `.env.local`, puis renseigner Firebase, PostHog, Resend et Stripe avant de brancher les services reels.

## Tests et verification

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Pour une verification rapide avant push :

```bash
npm.cmd run verify
```

Pour une verification complete avant staging :

```bash
npm.cmd run predeploy
npm.cmd audit --audit-level=moderate
```

## Deploiement staging

Le deploiement staging est prepare pour Vercel avec le preset Next.js standard. Ne mettez jamais de secret dans le code ou dans une variable `NEXT_PUBLIC_*`.

Consultez [DEPLOYMENT.md](./DEPLOYMENT.md) pour la checklist Vercel, les variables d'environnement, les regles Firebase a deployer et les verifications post-deploiement.

## Ordre de construction

1. Fondation Next.js, design system, layout global.
2. Landing page et formulaire lead avec validation.
3. Firebase Firestore pour les leads.
4. Auth Firebase et espace client minimal.
5. Dossier, documents, paiement Stripe.
6. Admin/CRM interne.
