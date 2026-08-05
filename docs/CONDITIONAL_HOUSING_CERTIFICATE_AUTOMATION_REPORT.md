# AVI CERTIFY - Automatisation de l'attestation conditionnelle de logement

Date de l'audit et de l'implémentation : 3 août 2026
Branche : `feat/conditional-housing-certificate-automation`
Base/HEAD non modifié : `ac8f556 docs(admin): update client 360 preview alias`

## 1. Verdict

**ARCHITECTURE READY, IMPLEMENTATION PARTIAL**

Le premier parcours fonctionnel est implémenté et déployé en Preview : formulaire client, catalogue de villes issu du classeur, Checkout au prix serveur, webhook signé et idempotent, job durable unique, confirmation partenaire admin, PDF/QR/checksum, stockage privé, métadonnées, visibilité client/admin et email après génération.

Le verdict ne peut pas être élevé à `READY FOR END-TO-END PREVIEW` car aucun parcours complet avec un compte test, Stripe test, webhook réel, adresse partenaire de test, email contrôlé et retry Stripe n'a été exécuté. La révocation et le remplacement versionné restent également un lot distinct.

Preview : https://avi-certify-lb3ulouay-avi-certify-platform.vercel.app

## 2. Audit de l'existant

Le dépôt contenait déjà Firebase Auth/Admin, Firestore, Storage privé, Stripe Checkout, un webhook signé, les collections `payments`, `documents`, `certificates`, `client_documents`, les téléchargements protégés, la vérification QR, Resend, l'espace client, Client 360 et les journaux opérationnels.

Le classeur source `data/imports/housing/AVI_CERTIFY_housing_inventory_2026-08-03.xlsx` a été lu en lecture seule, feuille par feuille :

- `Résidences disponibles` : 42 lignes de résidences, 28 communes, 21 zones ;
- `Couverture SafeHouse` : 32 villes/zones avec loyers indicatifs et couverture ;
- `Sources et méthode` : provenance et règle de confirmation opérationnelle.

Toutes les résidences exigent une confirmation de disponibilité auprès du partenaire. Le classeur ne constitue donc pas une preuve d'attribution individuelle ni une capacité temps réel.

| Élément | Fichier / route avant consolidation | Statut initial | Entrées | Sorties | Limite constatée |
|---|---|---|---|---|---|
| Paiement | `src/lib/server/payments.service.ts` | Fonctionnel | service, token | Checkout, payment | Région fournie par le client, pas de demande logement obligatoire |
| Webhook | `src/app/api/stripe/webhook/route.ts` | Signature vérifiée | événement Stripe | paiement + génération inline | Pas de registre persistant d'événements, PDF dans le chemin webhook |
| PDF paiement | `src/lib/certificates/certificate.service.ts` | Moteur distinct | payment | certificate/document | Divergent du workflow admin |
| PDF admin | `src/lib/certificates/certificate-workflow.service.ts` | Fonctionnel partiel | case | certificate/document/email | Adresse statique de repli possible |
| Inventaire | `src/lib/housing/housing-regions.ts` | Statique | région | adresse exacte | Pas une disponibilité partenaire confirmée |
| Storage | `users/{uid}/documents/*` | Privé | buffer serveur | PDF | Correct et réutilisable |
| Documents client | `/dossier/documents` + API protégée | Fonctionnel | owner | liste/téléchargement | Pas de demande logement structurée |
| Documents admin | routes admin documents + Client 360 | Fonctionnel | admin session | preview/download | Pas de lifecycle logement dédié |
| Vérification | `/verifier/[token]` | Fonctionnel | token | statut public minimisé | Pas de validité logement ni statut `REPLACED` |
| Email | Resend + templates | Fonctionnel | recipient/template | log/provider ID | Ancien contenu non conditionnel |

## 3. Workflow actuel

Avant ce lot, le bouton logement pouvait lancer directement le paiement. Le webhook marquait le paiement puis tentait une génération PDF inline. L'admin pouvait aussi appeler un autre moteur depuis Client 360. Ces chemins ne partageaient ni la même source d'adresse, ni le même contrôle préalable, ni le même modèle de retry.

## 4. Workflow cible

```text
Client Firebase vérifié
  -> formulaire logement strict
  -> housing_requests + client_cases
  -> Checkout Stripe au prix serveur
  -> webhook Stripe signé
  -> stripe_events idempotent
  -> payment=paid vérifié
  -> document_generation_jobs/housing_{paymentId}
  -> allocation_pending
  -> confirmation partenaire datée par admin
  -> service documentaire canonique
  -> PDF + QR + SHA-256
  -> Storage privé
  -> certificates + documents + client_documents + document_versions
  -> timeline + notification + communication log
  -> email sécurisé
```

Le verrou `allocation_pending` est volontaire. Sans inventaire temps réel ni preuve partenaire individualisée, une génération entièrement automatique immédiatement après paiement serait juridiquement et opérationnellement trompeuse.

## 5. Divergences détectées

| Critère | Ancien webhook | Ancienne action admin | Consolidation |
|---|---|---|---|
| Déclencheur | `checkout.session.completed` | action Client 360 | job unique créé par webhook, exécution après attribution admin |
| Identifiant | payment/client dépendant | case dépendant | document déterministe par dossier |
| Adresse | région/adresse statique | sélection statique | allocation confirmée et datée uniquement |
| Storage | chemin documents | chemin documents | `users/{uid}/documents/{certificateId}-attestation-hebergement.pdf` |
| Firestore | certificate/document | certificate/document | mêmes objets + demande/job/version |
| Email | inline après génération | workflow admin | service canonique, après persistance uniquement |
| Retry | webhook rejouable sans registre durable | manuel | événement Stripe + job + document déterministes |
| Échec | risque de timeout webhook | audit partiel | job `retryable`, erreur sanitisée, retry admin |

`certificate.service.ts` est désormais une frontière de compatibilité sans génération inline. Le seul moteur qui produit le document est `certificate-workflow.service.ts`.

## 6. Modèle Firestore

Collections utilisées ou créées côté serveur :

- `housing_requests` : identité, projet, ville, consentements, statut, paiement, allocation, job et document ;
- `client_cases` : dossier opérationnel existant, enrichi avec `housingRequestId` et statuts ;
- `payments` : prix, devise, owner, service, demande, session et preuve webhook ;
- `stripe_events/{eventId}` : lease de traitement, tentative, succès/échec ;
- `document_generation_jobs/housing_{paymentId}` : job durable et idempotent ;
- `certificates`, `documents`, `client_documents` : objets documentaires existants normalisés ;
- `document_versions` : snapshot de version, checksum et chemin ;
- `admin_case_events`, `admin_notifications`, `communication_logs` : audit et livraison.

L'allocation est embarquée dans `housing_requests` pour cette v1 afin d'éviter une collection supplémentaire sans besoin démontré. Une collection `housing_allocations` deviendra justifiée avec capacité, concurrence et historique multi-attributions.

## 7. Modèle Storage

Chemin retenu :

```text
users/{uid}/documents/{certificateId}-attestation-hebergement.pdf
```

Métadonnées : `ownerId`, `caseId`, `certificateId`, `certificateNumber`, `documentType`, `templateVersion`, `checksumSha256`, `housingRequestId`, `paymentId`.

Le chemin est construit côté serveur. Aucun chemin navigateur ni URL publique n'est accepté. Les règles existantes autorisent la lecture au propriétaire vérifié et refusent les écritures client sur le PDF généré. Aucune règle Firebase n'a été modifiée ou déployée.

## 8. Formulaire client

La page `/dossier/logement` collecte l'identité minimale utile, le projet académique, la ville, le type de logement, la durée, les notes bornées et cinq consentements explicites. L'email provient du compte Firebase et n'est pas éditable dans ce formulaire.

Le schéma Zod est strict : champs inconnus, HTML, ville inconnue, dates invalides ou normalisées, arrivée passée, durée hors bornes, loyer invalide et consentement manquant sont refusés. Le body est limité à 16 Ko et le `Content-Type` JSON est exigé.

Après engagement du paiement, les champs sont verrouillés. Une correction post-paiement doit passer par une action auditée future.

## 9. Villes et logements

`housing-locations.ts` contient les 32 villes/zones de la feuille de couverture, avec loyer indicatif, devise, nombre de couvertures et statut `conditionally_available` ou `limited`.

Les adresses et résidences exactes du classeur ne sont pas exposées au client. Elles ne deviennent utilisables dans le PDF qu'après saisie admin de la référence inventaire, du partenaire, de la résidence, de l'adresse, du loyer, de la preuve et de la période de validité.

## 10. Attribution conditionnelle

Après paiement, la demande passe à `allocation_pending`. L'admin doit enregistrer une confirmation partenaire datée. Le schéma impose un code postal français, un loyer EUR positif, une confirmation non future et une validité postérieure.

L'approbation est refusée si le paiement n'est pas réellement `paid`, si le rattachement owner/request est incohérent ou si un document a déjà été émis. Une correction après émission ne peut donc pas écraser silencieusement le document existant.

## 11. Paiement Stripe

Le prix existant est conservé : **7 900 centimes EUR**, issu de `src/constants/payments.ts`. Le navigateur n'envoie jamais le montant.

Le Checkout exige `housingRequestId` pour `accommodation_certificate`, vérifie le propriétaire et l'état payable, puis écrit uniquement des métadonnées non sensibles : owner/payment/request/case/city/service/schema/environment.

Le retour navigateur ne marque jamais le paiement comme payé.

## 12. Webhook

Le webhook lit le body brut, vérifie `stripe-signature`, réclame l'événement dans `stripe_events`, recharge le paiement créé côté serveur et compare propriétaire, service, montant et devise.

Pour l'attestation logement, il marque le paiement `paid` puis crée ou récupère le job déterministe. Il ne génère plus le PDF inline, ce qui réduit le risque de timeout Stripe.

## 13. Idempotence

- événement : document `stripe_events/{eventId}` avec lease de cinq minutes ;
- job : `document_generation_jobs/housing_{paymentId}` ;
- événements/notifications de paiement : IDs déterministes par paiement ;
- certificat : ID déterministe par dossier ;
- numéro : réutilisé si déjà persisté ;
- token : aléatoire 256 bits, réutilisé si déjà persisté ;
- email : drapeau `certificateEmailSent` ;
- version : document déterministe `{certificateId}_v{n}`.

Le replay séquentiel testé ne reconstruit ni PDF, ni fichier, ni email. Le verrou transactionnel concurrent du job pourra être renforcé lors du lot queue/worker si plusieurs workers parallèles sont introduits.

## 14. Job de génération

Le job porte le service, le document, le client, le dossier, la demande, le paiement, l'événement Stripe, les tentatives, la version du template, l'erreur sanitisée et le document final.

Il est d'abord `queued` avec `ALLOCATION_CONFIRMATION_REQUIRED`, puis `processing`, `succeeded` ou `retryable`. Le retry admin ne demande jamais au client de repayer.

## 15. Template PDF

Le PDF produit par `pdf-lib` contient le logo AVI CERTIFY réel, le titre `ATTESTATION CONDITIONNELLE DE LOGEMENT`, le statut conditionnel, la référence, l'identité, l'établissement, l'adresse confirmée, le loyer, l'entrée, la durée, la validité, les réserves juridiques, le QR, l'émetteur et la version.

La donnée légale retenue est celle déjà publiée par le projet : RCS/SIREN **942 370 545**, ORIAS **25005516**, siège 75 Rue de Besançon, 25300 Pontarlier. L'ancienne valeur contradictoire `101 528 123` n'est pas reproduite.

Le document indique une émission électronique. Aucune image de signature ou de cachet n'est dans `public/`, le dépôt, l'email ou le PDF.

## 16. QR et vérification

Le QR pointe vers `/verifier/{token}` avec un token non devinable. La page publique expose uniquement le statut, la référence, le nom pour un document actif, la ville, l'émission, la validité, le type et l'émetteur.

Les statuts `ACTIVE`, `REVOKED`, `EXPIRED` et `REPLACED` sont compris. Une date de validité dépassée transforme un enregistrement actif en réponse publique expirée et masque le nom/la ville.

## 17. Espace client

La navigation du dossier contient `Attestation logement`. La page affiche le formulaire, la couverture indicative, le prix, les réserves, le paiement et les états du workflow. Le document final utilise le centre de documents et le téléchargement propriétaire déjà protégés.

## 18. Admin OS

Client 360 charge la demande via `/api/admin/housing/requests`, affiche l'état, la ville, le paiement, l'allocation et le job. Les actions ajoutées permettent :

- confirmer l'attribution avec preuve partenaire ;
- déclencher le service canonique après confirmation ;
- relancer un job en erreur ;
- exploiter les routes documentaires existantes pour preview/download.

Les actions de révocation et remplacement versionné ne sont pas encore livrées.

## 19. Email

L'email Resend n'est tenté qu'après succès du PDF, du Storage et des métadonnées. Il contient la référence, la ville, le lien vers l'espace client, l'URL de vérification et le rappel conditionnel. Le PDF n'est pas joint et aucune URL Storage publique n'est envoyée.

Un échec email laisse le certificat `ACTIVE`, la demande `certificate_generated` et crée un log de communication en échec. Un succès passe la demande à `certificate_delivered`.

## 20. Gestion des erreurs

| Incident | Statut / effet | Retry | Message / audit |
|---|---|---|---|
| Paiement non confirmé | génération bloquée | non avant webhook | `HOUSING_PAYMENT_NOT_CONFIRMED` |
| Attribution absente | `allocation_pending` | approbation admin | notification admin |
| PDF/QR/Storage/metadata | job `retryable`, demande `failed` | route retry admin | code sanitisé |
| Email échoué | document conservé | renvoi par retry contrôlé | communication `FAILED` |
| Webhook dupliqué | réponse 200 sans retraitement | aucun | `duplicate_event` |
| Document existant | réutilisation | aucun PDF double | `certificate_already_exists` |
| Adresse indisponible | aucune émission | nouvelle confirmation | pas de promesse client |
| Données incomplètes | `PENDING_PROFILE`/job retryable | correction contrôlée | champs manquants auditables |

## 21. Sécurité

- Firebase ID token vérifié avec contrôle de révocation ;
- email vérifié exigé ;
- UID dérivé du token ;
- prix et devise côté serveur ;
- Zod strict, body borné, JSON imposé ;
- webhook Stripe signé ;
- événement et job idempotents ;
- paiement Firestore revalidé dans le service canonique, y compris depuis l'admin ;
- routes admin protégées par `requireAdmin` ;
- Storage privé et téléchargement owner/admin existant ;
- pas de HTML utilisateur dans le PDF ;
- pas de PII sensible dans les metadata Stripe ;
- pas de secret, signature ou URL Storage publique ajoutés.

Le build Vercel signale 29 vulnérabilités npm (18 modérées, 10 élevées, 1 critique) dans l'arbre global. Elles n'ont pas été modifiées dans ce lot et doivent faire l'objet d'un audit de dépendances séparé avant production.

## 22. Tests

Résultats :

- `npm.cmd run lint` : **PASSED** ;
- `npm.cmd run typecheck` : **PASSED** ;
- tests ciblés logement/certificat/Stripe/webhook : **PASSED** ;
- sélection explicite finale du périmètre : **9 fichiers, 33 tests PASSED** ;
- PDF réel : `%PDF`, taille non vide, marqueur EOF, logo sans fallback, QR généré : **PASSED** ;
- paiement persistant obligatoire depuis admin : **PASSED** ;
- replay sans second PDF/fichier/email : **PASSED** ;
- email échoué sans invalider le certificat : **PASSED** ;
- expiration publique et minimisation : **PASSED** ;
- tests admin historiquement lents, relancés isolément : **PASSED** ;
- `npm.cmd run build` local : **PASSED**, 58 pages statiques et routes logement incluses ;
- build Vercel Preview : **PASSED**.

La commande exacte `npm.cmd run test` n'est pas verte globalement : 289 tests réussis, 7 échecs dans 6 fichiers admin historiques. Six sont des timeouts de 5 secondes sous contention ; le septième est une pollution inter-fichiers d'un mock quote/storage. Les sept tests passent isolément. Cette dette du harnais Vitest n'est pas masquée et empêche un verdict de validation totale.

La commande abrégée `npm.cmd run test -- housing` a également rencontré un timeout de démarrage d'un worker Vitest après avoir exécuté 2 fichiers/3 tests avec succès. La sélection par chemins explicites couvrant validations, demande, Checkout, webhook, événement Stripe, job, PDF, admin retry et bouton paiement passe intégralement (9/9 fichiers, 33/33 tests).

## 23. Preview

- URL : https://avi-certify-lb3ulouay-avi-certify-platform.vercel.app
- ID : `dpl_34KFFYY2aWKhGtNTXNjY36pAkYVs`
- cible : `preview`
- statut Vercel : `Ready`
- `/dossier/logement` : HTTP 200, CSP/HSTS/noindex présents ;
- page anonyme via navigateur : protection Vercel active ;
- parcours Stripe test/webhook/email : **NOT EXECUTED** ;
- aucun compte ou client réel utilisé.

## 24. Limites

1. Pas de test E2E Stripe test avec webhook réel et retry.
2. Pas d'email de test contrôlé envoyé.
3. Pas de validation visuelle manuelle desktop/mobile authentifiée.
4. Attribution manuelle obligatoire tant qu'aucune disponibilité partenaire temps réel n'existe.
5. Pas de réservation de capacité concurrente.
6. Pas de révocation/remplacement depuis l'Admin OS.
7. Référence déterministe mais pas compteur séquentiel atomique officiel.
8. Texte juridique et qualité de signataire à valider par AVI CERTIFY/conseil compétent.
9. Suite Vitest complète instable sous exécution globale.
10. Audit npm de dépendances à traiter séparément.

## 25. Décisions métier/juridiques requises

Validation explicite du fondateur requise sur :

1. nom exact du produit ;
2. prix exact de 79 EUR ;
3. liste des villes ;
4. adresses autorisées ;
5. partenaires pouvant être cités ;
6. types de logement ;
7. loyer affiché ;
8. durée standard ;
9. durée de validité du document ;
10. texte juridique exact ;
11. signataire et qualité ;
12. usage du logo, d'une signature et d'un cachet ;
13. format de numérotation, recommandé `HOU` ou `DOM` plutôt que la convention AVI financière ;
14. conditions de remplacement d'adresse ;
15. politique d'annulation/remboursement ;
16. cas où une validation admin reste obligatoire ;
17. données visibles sur la vérification QR ;
18. pièces exigées avant paiement ;
19. corrections autorisées après paiement ;
20. libellé exact du statut de pré-réservation.

## 26. Fichiers créés

- `src/types/housing.ts`
- `src/lib/housing/housing-locations.ts`
- `src/lib/housing/housing-request.service.ts`
- `src/lib/validations/housing.ts`
- `src/lib/server/stripe-event.service.ts`
- `src/app/api/client/housing-request/route.ts`
- `src/app/api/admin/housing/_utils.ts`
- `src/app/api/admin/housing/requests/route.ts`
- `src/app/api/admin/housing/requests/[requestId]/approve-allocation/route.ts`
- `src/app/api/admin/housing/requests/[requestId]/retry/route.ts`
- `src/app/dossier/logement/page.tsx`
- tests logement, paiement, webhook, job, PDF et routes admin associés
- ce rapport

## 27. Fichiers modifiés

- Checkout/webhook : `src/app/api/stripe/*`, `src/lib/server/payments.service.ts`, types/validation paiement ;
- moteur documentaire : `certificate.service.ts`, `certificate-workflow.service.ts`, `certificate-generator.ts`, template et email ;
- client : navigation dashboard et `payment-button.tsx` ;
- admin : `super-admin-operations-os.tsx` ;
- documents/vérification : `document.service.ts`, `document.ts`, `/verifier/[token]` ;
- tests correspondants.

`.gitignore` était déjà modifié avant ce lot pour ignorer le classeur opérationnel et n'est pas revendiqué comme une modification de cette mission.

## 28. Commits

Aucun commit créé. Le HEAD reste `ac8f556`. Les changements sont locaux sur la branche dédiée afin de permettre une revue et un découpage P2-P9 avant staging.

## 29. PR

Aucune PR créée et aucun push exécuté. Aucun fichier hors périmètre ne doit être inclus. Le lot actuel est trop large pour une PR unique sans découpage de revue.

## 30. Prochain lot

1. Découper/stager explicitement P2-P9 après revue métier et juridique.
2. Stabiliser le harnais Vitest global sans toucher aux comportements admin.
3. Exécuter un E2E Preview contrôlé avec compte, destinataire et Stripe test dédiés.
4. Vérifier visuellement le PDF, le mobile, l'espace client, Client 360 et le QR.
5. Livrer P10 : révocation, remplacement versionné, renvoi email et audit.
6. Définir la numérotation atomique officielle et le texte juridique approuvé.
7. Auditer puis corriger les vulnérabilités npm sans mise à jour forcée aveugle.

### Confirmations de non-régression

- aucun paiement live ;
- aucun email envoyé à un client réel ;
- aucun déploiement production ;
- aucune règle Firebase modifiée ou déployée ;
- aucun secret ajouté ;
- aucune signature exposée ;
- aucun template AVI financier modifié ;
- PostHog inchangé ;
- Brand Experience V2 inchangé ;
- stash `wip-before-traceability-foundation` préservé ;
- `.claude/.claude/`, `docs/architecture/`, `docs/audits/` et l'image publique exclue restent intacts.

### Sorties Git finales

`git status --short --branch` :

```text
## feat/conditional-housing-certificate-automation
 M .gitignore
 M src/app/api/stripe/create-checkout-session/route.ts
 M src/app/api/stripe/webhook/route.ts
 M src/app/verifier/[token]/page.tsx
 M src/components/admin/super-admin-operations-os.tsx
 M src/components/dashboard/dashboard-navigation.ts
 M src/components/payments/payment-button.test.tsx
 M src/components/payments/payment-button.tsx
 M src/lib/certificates/certificate-generator.test.ts
 M src/lib/certificates/certificate-generator.ts
 M src/lib/certificates/certificate-workflow.service.test.ts
 M src/lib/certificates/certificate-workflow.service.ts
 M src/lib/certificates/certificate.service.ts
 M src/lib/certificates/housing-certificate-template.ts
 M src/lib/documents/document.service.ts
 M src/lib/email/templates/certificate-available.ts
 M src/lib/server/payments.service.ts
 M src/lib/validations/payment.test.ts
 M src/lib/validations/payment.ts
 M src/types/document.ts
 M src/types/payment.ts
?? .claude/.claude/
?? docs/CONDITIONAL_HOUSING_CERTIFICATE_AUTOMATION_REPORT.md
?? docs/USER_TO_CASE_LIFECYCLE_DIAGNOSTIC.md
?? docs/architecture/
?? docs/audits/
?? public/assets/photos/Capture d'écran 2026-06-19 160947.png
?? src/app/api/admin/housing/
?? src/app/api/client/housing-request/
?? src/app/api/stripe/webhook/route.test.ts
?? src/app/dossier/logement/
?? src/lib/housing/housing-locations.ts
?? src/lib/housing/housing-request.service.test.ts
?? src/lib/housing/housing-request.service.ts
?? src/lib/server/payments.service.test.ts
?? src/lib/server/stripe-event.service.test.ts
?? src/lib/server/stripe-event.service.ts
?? src/lib/validations/housing.test.ts
?? src/lib/validations/housing.ts
?? src/types/housing.ts
```

`git log --oneline -10` :

```text
ac8f556 docs(admin): update client 360 preview alias
54c8bb7 docs(admin): record client 360 regression preview
2f241ca fix(admin): restore client 360 action workflows
6b68fb9 fix(admin): resolve document owners in operations OS
6266d57 fix(admin): show and download client documents in 360
81fb145 fix(avi): lock France AVI certificate template
7094658 feat(admin): port verified AVI template generation
ef14291 feat(admin): add manual AVI PDF generator
48b656d Merge pull request #17 from djbefolo/feat/posthog-analytics-audit-fix
75389b7 copy(marketing): clarify mobility and financial services
```

`git diff --check` : aucune erreur de whitespace. Les avertissements CRLF sont informatifs.
`git diff --stat` : 21 fichiers suivis, 1 439 insertions, 865 suppressions ; les nouveaux fichiers non suivis ne sont pas comptés par cette commande.
`git stash list` : `stash@{0}: On feat/client-traceability-foundation: wip-before-traceability-foundation`.
