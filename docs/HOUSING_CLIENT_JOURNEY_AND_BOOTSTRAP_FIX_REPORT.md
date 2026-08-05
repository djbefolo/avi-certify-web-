# AVI CERTIFY - Housing Client Journey and Bootstrap Fix Report

Date: 2026-08-04
Branch: `feat/conditional-housing-certificate-automation`
Verdict: **READY WITH STRIPE E2E PENDING**

## 1. Cause de la liste vide

Le catalogue client appelait exclusivement `housing_inventory` dans Firestore. En Preview, une collection vide, une configuration Firebase Admin absente ou une indisponibilite Firestore produisait donc une liste vide sans source de secours. Les trois fichiers bootstrap existaient localement mais aucun service, API ou flux de creation de demande ne les utilisait.

## 2. Strategie d'inventaire centralisee

Une seule strategie est maintenant portee par `housing-inventory.service.ts`:

1. Firestore est interroge en premier.
2. Une collection Firestore non vide reste autoritaire, y compris lorsqu'un element bootstrap de meme identifiant est absent.
3. Une collection vide ou une erreur Firestore bascule sur le bootstrap local.
4. Un bootstrap invalide retourne explicitement `source: "unavailable"`.
5. Les API renvoient `source: "firestore" | "bootstrap"` sans metadonnees confidentielles.

Fonctions exposees:

- `listAvailableHousingCities()`
- `listAvailableHousingResidences(cityCode)`
- `getHousingResidenceById(housingInventoryId)`
- `getHousingInventorySource()`

`housing-inventory.firestore.json` est conserve comme fixture/import non chargee par le frontend. Aucun import Firestore n'a ete execute.

## 3. Validation du bootstrap

| Controle | Resultat |
| --- | --- |
| JSON lisible | PASS |
| Villes/zones | 21 |
| Residences | 42 |
| Communes | 28 |
| References dupliquees | 0 |
| Villes sans residence | 0 |
| Donnees personnelles | 0 detectee |
| `autoIssuance.enabled` | `false` pour 42/42 |
| `eligibilityStatus` | `manual_review_only` pour 42/42 |
| `manualReviewRequired` | `true` pour 42/42 |
| Adresses publiques autorisees | 0/42, donc masquees cote client |

## 4. Securite et double parcours V3

- Le navigateur transmet uniquement l'identifiant serveur, la ville et le type choisis.
- Le nom de residence, l'adresse interne, le prix et la politique d'eligibilite sont relus cote serveur.
- Le `selectionSnapshot` conserve la source choisie, le prix serveur et l'adresse interne cote serveur.
- Une demande creee depuis le bootstrap reste liee a `inventorySource: "bootstrap"`, meme si Firestore est rempli plus tard.
- Le bootstrap force `manualReviewRequired: true` et ne peut pas decrementer un quota ni creer un job PDF automatique.
- Apres paiement, le flux bootstrap aboutit a `requires_admin_review`, avec notification idempotente.
- L'API de demande client ne renvoie plus `selectionSnapshot`, `autoDecisionSnapshot`, adresse interne, politique admin ou identifiant de paiement.
- L'adresse exacte n'est exposee que si `publicAddress.displayToClient === true`. Sinon, seule la commune est affichee avec un message honnete.

Les formules fintech, Stripe, le webhook, la generation PDF, le QR, les emails et les regles Firebase n'ont pas ete modifies.

## 5. API client

### Villes

`GET /api/client/housing/cities` renvoie:

- source non sensible;
- code et libelle;
- nombre de residences;
- loyer minimum affiche;
- devise;
- libelle de disponibilite conditionnelle.

### Residences

`GET /api/client/housing/residences?cityCode=...` valide strictement le code ville et renvoie:

- identifiant et reference operationnelle;
- residence, commune et code postal;
- types proposes;
- loyer mensuel et tarif ville indicatifs;
- statut public et mode de traitement;
- adresse uniquement lorsqu'elle est autorisee.

Aucune note interne, source partenaire confidentielle, adresse privee ou politique admin detaillee n'est exposee.

## 6. Parcours client

Le formulaire monolithique a ete remplace par quatre etapes:

1. **Vos informations**: profil Firebase/Firestore pre-rempli, email en lecture seule, validation inline.
2. **Votre projet d'etudes**: etablissement, ville, annee, date d'arrivee et duree.
3. **Choisissez votre logement**: recherche ville, liste dependante des residences, types reels et fiche logement.
4. **Verifiez votre demande**: identite, projet, logement, consentements et paiement.

Les champs date natifs accessibles permettent saisie clavier et calendrier, avec bornes et messages inline. La navigation conserve les donnees, focalise le titre de l'etape et dirige le focus vers la premiere erreur.

La fiche logement affiche le nom, le partenaire public, la commune, le type choisi, le loyer, le statut conditionnel et l'adresse publique autorisee. Pour le bootstrap, elle annonce explicitement la verification AVI CERTIFY apres paiement.

## 7. Paiement et recapitulatif

Le recapitulatif distingue:

- loyer mensuel indicatif, non encaisse a cette etape;
- frais de service AVI CERTIFY: 79 EUR;
- montant paye aujourd'hui: 79 EUR.

Le texte precise que les 79 EUR ne sont ni un loyer, ni un depot de garantie, ni une caution. Stripe n'est appele qu'apres validation des quatre etapes et des cinq consentements. Les demandes `payment_pending` ou ulterieures verrouillent une nouvelle tentative afin de limiter les doubles paiements accidentels.

## 8. Mes demandes

La section affiche la derniere demande avec:

- reference;
- ville/residence;
- statut de paiement;
- statut lisible;
- prochaine etape;
- date de mise a jour;
- reprise du brouillon;
- ouverture protegee de l'attestation lorsqu'un document existe.

Le service serveur reutilise une demande `draft` ou `awaiting_payment` au lieu de creer silencieusement un doublon.

## 9. Tests et build

| Validation | Resultat |
| --- | --- |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `$env:VITEST_MAX_WORKERS='1'; npm.cmd run test` | PASS - 82 fichiers, 325 tests |
| `npm.cmd run build` | PASS - Next.js 15.5.18, 58 pages |
| Build Vercel Preview | PASS |
| `git diff --check` | PASS, uniquement avertissements LF/CRLF |

Les tests P0 couvrent notamment:

- 21 villes, 42 residences et unicite des references;
- invariant `manual_review_only` sur 42/42;
- priorite Firestore;
- fallback Firestore vide ou en erreur;
- erreur controlee si bootstrap invalide;
- filtrage ville et resolution par ID;
- masquage des adresses internes;
- refus anonyme;
- pre-remplissage et quatre etapes UI;
- remise a zero ville/residence/type;
- separation loyer/frais;
- payload client sans prix ni adresse;
- demande bootstrap avec prix/snapshot serveur;
- revue admin sans job PDF automatique;
- idempotence webhook/email deja couverte par la suite existante.

## 10. Preview et preuve runtime

Preview: <https://avi-certify-ka6uidjk2-avi-certify-platform.vercel.app/dossier/logement>

Preuves obtenues:

- deploiement Preview Vercel reussi sans `--prod`;
- build distant reussi;
- protection Vercel franchie depuis la session navigateur existante;
- acces anonyme a `/dossier/logement` redirige vers la connexion client;
- aucune requete Stripe, aucun webhook, aucun email et aucune ecriture Firestore executes pendant cette validation.

Non executes faute d'identifiants client de test fournis:

- verification visuelle authentifiee des 21 villes;
- parcours de trois villes/residences en Preview;
- captures desktop et mobile de la page authentifiee;
- Stripe Test, webhook, revue admin et document final.

La tentative de relire les noms de variables Preview avec `vercel env ls preview` a expire sans sortie. Aucune valeur secrete n'a ete lue ou affichee. La politique bootstrap reste toutefois fermee independamment du kill switch global.

## 11. Checklist manuelle Preview

1. Se connecter avec un compte client de test verifie.
2. Ouvrir `/dossier/logement` et confirmer 21 villes.
3. Tester au moins trois villes et leurs residences.
4. Verifier le type, le loyer, la commune et le masquage de l'adresse exacte.
5. Parcourir les quatre etapes puis revenir en arriere.
6. Verifier desktop 1440 px et mobile 390 px.
7. Confirmer le message de revue manuelle pour une residence bootstrap.
8. Ne pas finaliser Stripe sans scenario Test controle.
9. En Stripe Test, verifier `requires_admin_review`, absence de job PDF automatique et idempotence du replay.

## 12. Fichiers du lot proposes au staging

- `src/data/housing-inventory.bootstrap.json`
- `src/data/housing-inventory.bootstrap.ts`
- `src/data/housing-inventory.bootstrap.test.ts`
- `src/data/housing-inventory.firestore.json` (fixture/import uniquement)
- `src/types/housing.ts`
- `src/lib/housing/housing-inventory.service.ts`
- `src/lib/housing/housing-inventory.service.test.ts`
- `src/lib/housing/housing-inventory.invalid-bootstrap.test.ts`
- `src/lib/housing/housing-request.service.ts`
- `src/lib/housing/housing-request.service.test.ts`
- `src/app/api/client/housing/_auth.ts`
- `src/app/api/client/housing/cities/route.ts`
- `src/app/api/client/housing/cities/route.test.ts`
- `src/app/api/client/housing/residences/route.ts`
- `src/app/api/client/housing/residences/route.test.ts`
- `src/app/api/client/housing-request/route.ts`
- `src/app/api/client/housing-request/route.test.ts`
- `src/app/dossier/logement/page.tsx`
- `src/app/dossier/logement/page.test.tsx`
- `docs/HOUSING_CLIENT_JOURNEY_AND_BOOTSTRAP_FIX_REPORT.md`

Fichiers explicitement exclus du lot: `.claude/.claude/`, `docs/architecture/`, `docs/audits/`, les rapports anterieurs non lies, l'image publique non liee, `src/lib/housing/housing-locations.ts`, les workbooks Excel et le stash historique.

`package.json` et `package-lock.json` n'ont pas ete modifies. Le fichier temporaire `C:/Users/gabri/AppData/Local/Temp/avi-housing-workbook-audit-v3/audit.mjs` reste hors depot et non stage.

## 13. Limites et risques restants

1. Le parcours authentifie et les captures responsive doivent etre confirmes manuellement sur la Preview.
2. Le Stripe Test E2E et le replay webhook n'ont volontairement pas ete executes.
3. La valeur courante du kill switch Preview n'a pas ete relue pendant ce passage; les residences bootstrap sont neanmoins techniquement forcees en revue manuelle.
4. Le build Vercel signale 31 vulnerabilites npm (19 moderees, 11 elevees, 1 critique). Leur triage dependances doit faire l'objet d'un lot securite distinct, sans `npm audit fix --force` aveugle.
5. Les 42 adresses bootstrap restent masquees car aucune n'a `displayToClient=true`; leur publication exige une validation metier explicite.

## Verdict final

**READY WITH STRIPE E2E PENDING**

Le correctif est compile, teste, deploye en Preview et ferme par defaut pour les residences bootstrap. La validation manuelle authentifiee, les captures responsive et le Stripe Test E2E restent les seules preuves produit non executees.
