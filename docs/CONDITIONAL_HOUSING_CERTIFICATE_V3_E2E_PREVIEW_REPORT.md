# AVI CERTIFY - Validation E2E Preview V3

Date : 2026-08-04
Branche : `feat/conditional-housing-certificate-automation`
Commit fonctionnel : `bfa336088d8b9bbd714d7258994ee53fba703c50`
Preview : <https://avi-certify-mur8ol3nq-avi-certify-platform.vercel.app>

## Verdict

**BLOCKED**

Le code, le commit, le push, le build Vercel Preview et les smoke tests sont validés. Les deux scénarios E2E avec Firestore, Stripe test, PDF, Storage et Resend ne sont pas exécutés, car le projet Firebase Preview ne peut pas être identifié et confirmé non-production depuis les variables chiffrées exportées par la CLI. Aucun `--apply` n'a été lancé.

## 1. Contrôle du lot Git

- script temporaire contrôlé : `C:/Users/gabri/AppData/Local/Temp/avi-housing-workbook-audit-v3/audit.mjs` ; il est hors du dépôt et absent du staging ;
- classeur source : `data/imports/housing/AVI_CERTIFY_housing_inventory_2026-08-03.xlsx` ; il est ignoré par `.gitignore`, non stageé et absent de `public/` ;
- `package.json` et `package-lock.json` sont cohérents pour `exceljs@4.4.0` ;
- 52 fichiers V3 ont été stageés explicitement, sans `git add .` ni `git add -A` ;
- les audits, diagnostics, réglages locaux, capture publique et le fichier historique non référencé `housing-locations.ts` sont restés hors du commit ;
- `git diff --cached --check` était propre avant commit.

## 2. Correction produit adresse publique

L'API client n'exposait auparavant que la commune. Le modèle distingue désormais :

- `address` : adresse interne complète, jamais renvoyée par l'API de sélection client ;
- `publicAddress.formattedAddress` : adresse publique candidate ;
- `publicAddress.displayToClient` : autorisation explicite d'affichage.

Comportement :

- tout import neuf initialise `displayToClient=false` ;
- une validation admin est nécessaire pour activer l'affichage ;
- l'activation journalise `validatedAt` et `validatedByAdminUid` ;
- l'API client renvoie `publicAddress=null` tant que l'adresse n'est pas validée ;
- notes internes, références partenaires confidentielles et adresse interne ne sont jamais incluses dans cette réponse ;
- l'écran étudiant affiche résidence, type, prix indicatif et adresse publique lorsqu'elle est autorisée.

Un test de route couvre l'adresse publique visible et l'absence de fuite de l'adresse interne.

## 3. Import contrôlé

Dry-run local :

| Mesure | Résultat |
| --- | ---: |
| Lignes inventaire | 42 |
| Villes | 21 |
| Auto-éligibles créées par import | 0 |
| Adresses publiques affichées par import | 0 |

Le script prend en charge :

- mode par défaut : parsing Excel sans Firebase ;
- `--plan` : lecture Firestore uniquement, sans écriture ;
- `--apply` : écriture bloquée sans concordance du projet, cible `preview` et confirmation non-production explicite.

Collections prévues par l'import :

1. `housing_inventory` ;
2. `housing_import_batches`.

## 4. Garde d'approbation Firestore

État exigé avant `--apply` :

| Point | État |
| --- | --- |
| `FIREBASE_PROJECT_ID` ciblé | Non confirmé depuis la Preview |
| Projet confirmé non-production | Non |
| Créations | Non calculées |
| Mises à jour | Non calculées |
| Total source | 42 |
| Écriture exécutée | Non |

Constat : les variables Firebase Admin existent par nom dans Vercel Preview, mais leur export local par `vercel env pull` et `vercel env run` produit des valeurs vides. Cela peut être une restriction d'export des variables chiffrées et ne prouve pas que le runtime Vercel est mal configuré. En revanche, cela empêche une preuve locale sûre du projet Firestore visé.

Le projet Firebase par défaut du dépôt est `avi-certify-platform`. Il n'a pas été utilisé comme cible implicite, car son caractère non-production n'est pas démontré.

## 5. Configuration Vercel Preview

- liaison confirmée : organisation `avi-certify-platform`, projet `avi-certify-web` ;
- cible Vercel : `preview` ;
- déploiement : `dpl_3JX5iktJAd7yjigPeW3tbSkyTUcQ` ;
- statut : `Ready` ;
- `HOUSING_AUTO_ISSUANCE_ENABLED=false` ajouté uniquement à la Preview de la branche V3 ;
- aucune commande `vercel --prod`, promotion ou alias Production.

## 6. Validations locales

| Commande | Résultat |
| --- | --- |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `$env:VITEST_MAX_WORKERS='1'; npm.cmd run test` | PASS - 76 fichiers, 308 tests |
| `npm.cmd run build` | PASS - 58 pages statiques |
| `git diff --check` | PASS |
| `npm.cmd run housing:inventory:import` | PASS - dry-run uniquement |

Le build Vercel Preview a également compilé et généré les 58 pages avec succès.

## 7. Smoke tests Preview

| Route | Résultat |
| --- | --- |
| `/` | 200 |
| `/admin` anonyme | 307 vers `/admin/login?next=%2Fadmin` |
| Cookies admin obsolètes | supprimés par la réponse `/admin` |
| `X-Robots-Tag` admin | `noindex, nofollow, noarchive` |
| `/admin/login` | 200 |
| `/dossier/logement` | 200 |
| `/api/client/housing/cities` anonyme | 401 |
| `/verifier/test-token` | 200, non intercepté par le middleware admin |

## 8. Double parcours et idempotence

Validation locale automatisée :

- parcours éligible : décision moteur, réservation de capacité, job déterministe et pipeline PDF canonique ;
- parcours non éligible : aucune génération, notification de revue et approbation admin requise ;
- replay Stripe : événement revendiqué une seule fois ;
- double approbation : snapshot/job existants réutilisés ;
- PDF : document existant réutilisé ;
- email : marqueur de livraison empêchant une seconde émission ;
- quota : décrément dans la transaction de décision, une seule fois.

Preuve fournisseur externe : **NON EXÉCUTÉE**.

## 9. Scénarios E2E

### Scénario A - résidence éligible

**NON EXÉCUTÉ** : inventaire Preview non importé, aucune résidence test prévalidée, aucun paiement Stripe test et aucun email contrôlé envoyé.

### Scénario B - revue forcée

**NON EXÉCUTÉ** : même garde Firestore. Aucun paiement, PDF, notification ou email fournisseur n'a été déclenché.

## 10. Temps webhook et queue

Le temps réel du webhook et un éventuel timeout PDF ne peuvent pas être mesurés sans scénario Stripe Preview. Le job est persisté avant traitement, mais le PDF reste généré dans le cycle de la requête webhook. Une queue/worker séparé reste recommandé si le test Preview démontre un timeout ou une latence proche de la limite Vercel.

## 11. Conditions de reprise

1. fournir ou activer des identifiants Firebase Admin exportables pour un projet explicitement non-production ;
2. exécuter `--plan` et vérifier projet, créations, mises à jour et collections ;
3. obtenir l'approbation explicite de `--apply` ;
4. importer les 42 résidences et confirmer zéro auto-éligible ;
5. prévalider une seule résidence et son adresse publique ;
6. activer le kill switch global uniquement après cette prévalidation ;
7. utiliser un client test, Stripe test et une boîte email contrôlée pour les deux scénarios ;
8. mesurer webhook, replay, double approbation, quota, PDF et emails.

## Conclusion

La Preview applicative est prête, mais la validation financière/documentaire de bout en bout reste bloquée au garde-fou Firebase non-production. Le système n'a effectué aucune écriture Firestore, aucun Stripe live, aucun email client réel et aucune modification de règles Firebase.

**Verdict final : BLOCKED**
