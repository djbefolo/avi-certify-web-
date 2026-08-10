# AVI CERTIFY - Attestation conditionnelle de logement V3

Date : 2026-08-03
Branche locale : `feat/conditional-housing-certificate-automation`
Verdict : **READY WITH E2E LIMITATIONS**

## 1. Périmètre finalisé

La V2 locale a été complétée sans reconstruire le workflow existant. Le système prend désormais en charge deux parcours après confirmation d'un paiement Stripe conforme :

1. résidence explicitement prévalidée et règles satisfaites : décision `ELIGIBLE`, réservation de capacité, snapshot documentaire, job unique et génération par le moteur PDF canonique ;
2. condition non satisfaite : statut `requires_admin_review`, aucune génération PDF, notification admin, email client de mise en revue et journal de communication.

Le moteur financier, l'authentification admin, les paiements publics, le vérificateur et les règles Firebase n'ont pas été modifiés hors des intégrations logement déjà nécessaires.

## 2. Audit de la source Excel

Classeur lu en lecture seule : `data/imports/housing/AVI_CERTIFY_housing_inventory_2026-08-03.xlsx`.

| Feuille | Résultat |
| --- | --- |
| Résidences disponibles | 42 résidences, 28 communes, 21 zones, références `AVI-LOG-FR-0001` à `AVI-LOG-FR-0042` |
| Couverture SafeHouse | 32 villes/zones de couverture marketing |
| Sources et méthode | sources officielles et limites opérationnelles |

Le classeur précise qu'aucune disponibilité individuelle n'est garantie et qu'une confirmation partenaire reste nécessaire. En conséquence, l'import place toute nouvelle résidence en `confirmation_required`, `manual_review_only`, `isEligibleForCertificate=false` et `autoIssuance.enabled=false`.

## 3. Inventaire Firestore et import contrôlé

Collections opérationnelles prévues :

- `housing_inventory` ;
- `housing_import_batches`.

Le script `scripts/import-housing-inventory.mjs` :

- valide la feuille, les en-têtes, les 42 références et les champs structurants ;
- fonctionne en dry-run par défaut ;
- exige `--apply` et la correspondance explicite entre `FIREBASE_PROJECT_ID` et `HOUSING_IMPORT_CONFIRM_PROJECT_ID` pour écrire ;
- préserve les règles de gouvernance déjà enrichies lors d'un réimport ;
- n'active jamais l'émission automatique pendant l'import.

Preuve dry-run : 42 lignes, 21 codes ville/zone, `autoIssuanceEnabledByImport=false`.

Commande d'écriture non exécutée :

```powershell
$env:HOUSING_IMPORT_CONFIRM_PROJECT_ID=$env:FIREBASE_PROJECT_ID; npm.cmd run housing:inventory:import -- --apply
```

Impact : écrit ou met à jour uniquement `housing_inventory` et `housing_import_batches` dans le projet Firebase explicitement confirmé.

## 4. Moteur de décision

Service pur : `src/lib/housing/housing-auto-issuance-policy.service.ts`.

Version : `housing-auto-issuance-v1`.

Raisons explicites :

- `ELIGIBLE` ;
- `RESIDENCE_NOT_ELIGIBLE` ;
- `VALIDATION_EXPIRED` ;
- `PRICE_NOT_VERIFIED` ;
- `CAPACITY_EXHAUSTED` ;
- `ARRIVAL_DATE_OUT_OF_RANGE` ;
- `REQUEST_INCOMPLETE` ;
- `PAYMENT_NOT_CONFIRMED` ;
- `DUPLICATE_OR_FRAUD_RISK` ;
- `MANUAL_REVIEW_FORCED` ;
- `GLOBAL_KILL_SWITCH_DISABLED`.

Le kill switch serveur `HOUSING_AUTO_ISSUANCE_ENABLED` est strict : seule la valeur `true` autorise l'automatisation. Toute absence, erreur ou valeur différente route vers la revue admin.

## 5. Double parcours Stripe

Après `checkout.session.completed` signé et vérifié :

- le montant serveur de 7 900 centimes EUR, le service, le propriétaire et la demande sont revalidés ;
- le paiement est persisté ;
- la demande, le paiement et la résidence sont relus dans une transaction Firestore ;
- `autoDecisionSnapshot` est persisté.

### Parcours automatique

- vérification complète de la résidence, du loyer, de la validité, de la date d'arrivée, du quota, de la demande et du paiement ;
- décrément atomique du quota lorsque configuré ;
- création de l'allocation et de `certificateSnapshot` ;
- création du job déterministe `housing_<paymentId>` ;
- traitement par le moteur PDF existant ;
- QR, checksum SHA-256, Storage privé, métadonnées, espace client et email final restent servis par le workflow canonique.

### Parcours avec revue

- aucun job PDF n'est créé ;
- statut `requires_admin_review` ;
- dossier `UNDER_REVIEW` ;
- événement et notification admin déterministes ;
- email client immédiat précisant que le paiement est confirmé et qu'aucun paiement supplémentaire n'est requis ;
- journal `communication_logs` avec statut Resend honnête.

Une erreur technique de génération rebascule également vers la revue admin et crée une alerte explicite.

## 6. Snapshots et source documentaire

Les nouvelles demandes V3 utilisent :

- `selectionSnapshot` au choix de la résidence ;
- `paymentSnapshot` avant Checkout ;
- `autoDecisionSnapshot` après paiement ;
- `adminApprovalSnapshot` pour le parcours exceptionnel ;
- `certificateSnapshot` comme source exclusive des données injectées dans le PDF.

Le navigateur ne transmet ni adresse de certificat ni loyer opposable. Ces données sont relues depuis Firestore puis figées côté serveur.

## 7. Expérience client et administration

Le formulaire `/dossier/logement` charge les villes et résidences via :

- `GET /api/client/housing/cities` ;
- `GET /api/client/housing/residences?cityCode=...`.

Ces routes exigent un token Firebase révoqué-vérifié et un email vérifié. Le client choisit une résidence par identifiant ; les adresses exactes ne sont pas exposées par les API de sélection.

L'Admin OS contient un module `Logements` permettant de consulter l'inventaire et de gérer :

- visibilité et statut ;
- éligibilité certificat ;
- loyer vérifié ;
- activation par résidence ;
- date de validité ;
- quota et capacité restante ;
- fenêtre d'arrivée ;
- revue manuelle ;
- suspension immédiate.

Chaque modification passe par une API admin protégée et crée un événement d'audit. Le kill switch global est seulement affiché dans l'UI et ne peut pas être contourné par le frontend.

## 8. Idempotence

- événements Stripe : claim persistant existant conservé ;
- décision : snapshot réutilisé sur retry ;
- quota : décrément transactionnel une seule fois ;
- job : identifiant déterministe par paiement ;
- PDF : identifiant, chemin Storage et version déterministes ;
- email final : mécanisme existant de non-répétition conservé ;
- email de revue : identifiant de communication déterministe et non-renvoi après `SENT` ;
- approbation admin : réutilisation du snapshot et du job si une approbation est déjà en cours.

## 9. Validation locale

| Vérification | Résultat |
| --- | --- |
| Import Excel dry-run | PASS - 42 lignes, 21 zones, aucune activation automatique |
| Tests ciblés logement/Stripe/PDF | PASS - 5 fichiers, 26 tests |
| Suite complète | PASS - 75 fichiers, 307 tests |
| ESLint | PASS - aucune erreur ni warning |
| TypeScript | PASS |
| Build Next.js 15.5.18 | PASS - 58 pages générées |
| `git diff --check` | PASS - avertissements CRLF uniquement |

Le premier build sandboxé n'a pas pu télécharger IBM Plex Sans (`EACCES`). Le même build local autorisé hors sandbox a réussi. Aucun déploiement n'a été effectué.

## 10. Sécurité préservée

- aucune lecture directe de l'inventaire Firestore par le navigateur ;
- aucune adresse ou prix client accepté comme source documentaire ;
- APIs admin protégées par `requireAdmin` ;
- accès client protégé par Firebase Auth et vérification de révocation ;
- collections inconnues refusées par défaut par les règles Firestore existantes ;
- aucun changement Stripe live, Resend live, règles Firebase ou environnement de production ;
- aucune écriture Firestore réelle pendant cette phase.

## 11. Limites E2E et étapes manuelles

Non exécuté : import Firestore réel, activation d'une résidence, paiement Stripe test, email Resend réel, test navigateur des deux parcours et Preview. Ces opérations nécessitent une mutation d'infrastructure ou un déploiement explicitement approuvé.

Checklist Preview restante :

1. déployer en Preview après accord ;
2. ajouter `HOUSING_AUTO_ISSUANCE_ENABLED=false` en Preview ;
3. approuver puis exécuter l'import Firestore contrôlé ;
4. prévalider une résidence test dans l'Admin OS ;
5. activer le kill switch en Preview ;
6. exécuter un paiement Stripe test sur une résidence éligible et vérifier PDF, QR, Storage, email et espace client ;
7. exécuter un second paiement test avec résidence expirée ou revue forcée et vérifier absence de PDF, email immédiat et file admin.

## 12. Risques résiduels

- le traitement PDF reste déclenché dans le cycle du webhook après persistance du job ; Stripe peut relancer en cas de timeout, mais un worker de queue managé serait préférable à terme ;
- la preuve E2E Firebase/Stripe/Resend n'est pas exécutée dans cette phase ;
- `exceljs` est une dépendance de développement uniquement ; l'arbre npm signale 31 vulnérabilités globales, dont la majorité préexistait et doit faire l'objet d'un chantier de dépendances séparé ;
- les demandes V2 sans snapshots restent volontairement non automatiques et exigent une validation admin.

## 13. Conclusion

Le code V3 est compilable, testé et fail-closed. Le double parcours est implémenté sans activation implicite de l'inventaire. La validation finale produit reste conditionnée aux deux scénarios E2E en Preview.

**Verdict final : READY WITH E2E LIMITATIONS**
