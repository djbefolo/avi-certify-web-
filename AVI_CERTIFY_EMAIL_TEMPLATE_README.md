# AVI CERTIFY - Email Launch 2026

Livrables créés pour la première campagne emailing AVI CERTIFY, compatible Brevo via le bloc **Code HTML personnalisé**.

## Fichiers

- `avi-certify-email-launch-2026.html` : HTML email complet, responsive, table-based, sans JavaScript ni CSS externe.
- `AVI_CERTIFY_EMAIL_TEMPLATE_README.md` : guide d’utilisation, test et conformité.
- `public/email/avi-certify-logo.png` : logo optimisé pour email.
- `public/email/hero-student-mobility.jpg` : visuel hero optimisé pour email.

## Images retenues

Images sources vérifiées dans `public/assets/photos/` du projet AVI CERTIFY WEB PLATFORM :

- `avi-certify-logo.png`
- `beautifull-african-student-landed-france.jpg`

Images finales à utiliser dans Brevo après déploiement Vercel :

- `https://avicertify.fr/email/avi-certify-logo.png`
- `https://avicertify.fr/email/hero-student-mobility.jpg`

Image optionnelle non trouvée dans les assets actuels :

- `https://avicertify.fr/email/guide-2026-mockup.png`

Le template utilise donc un mockup ebook en HTML pour éviter d’inventer un chemin et limiter le poids du mail.

## Liens à vérifier ou remplacer

- CTA principal : `https://avicertify.fr`
- Services / préfinancement : `https://avicertify.fr/services`
- Guide gratuit : `https://avicertify.fr/guide-installation-france`
- WhatsApp : `https://wa.me/message/XOKRBYI3ZEQBM1`
- Lien navigateur Brevo : `{{ mirror }}`
- Désinscription Brevo : `{{ unsubscribe }}`

Personnalisation Brevo utilisée dans le HTML :

```html
Bonjour {{ contact.FIRSTNAME | default:'Bonjour' }},
```

Si le filtre `default` n’est pas accepté dans votre compte Brevo, remplacez par une syntaxe valide Brevo ou par une salutation neutre :

```html
Bonjour,
```

## Utilisation dans Brevo

1. Déployer le projet sur Vercel pour rendre `/email/avi-certify-logo.png` et `/email/hero-student-mobility.jpg` publics.
2. Ouvrir Brevo, créer une campagne email, puis choisir **Code HTML personnalisé**.
3. Coller le contenu complet de `avi-certify-email-launch-2026.html`.
4. Vérifier l’aperçu desktop et mobile.
5. Envoyer des tests vers Gmail, Outlook, Yahoo et Apple Mail si possible.
6. Cliquer sur chaque CTA dans l'email de test.
7. Vérifier que `{{ mirror }}`, `{{ unsubscribe }}` et la personnalisation du prénom sont bien remplacés par Brevo.

## Checklist avant envoi

- Objet et preheader cohérents avec le contenu.
- Domaine expéditeur authentifié : SPF, DKIM et DMARC.
- Images chargées en HTTPS public.
- Texte comprehensible meme si les images ne se chargent pas.
- Liens CTA avec UTM si suivi campagne requis.
- Lien de désinscription présent et fonctionnel.
- Segment d’envoi conforme : réseau chaud, alumni ou prospects qualifiés.
- Test mobile valide : lisibilité, CTA visibles, pas de débordement.
- Poids email raisonnable : pas d'image unique qui porte tout le message.

## Points de conformité à vérifier

- Ne pas promettre l’obtention d’un visa.
- Ne pas promettre l’obtention d’un financement, d’un crédit ou d’une somme d’argent.
- Maintenir la mention "selon éligibilité" pour le préfinancement.
- Vérifier les formulations liées aux partenaires financiers avant envoi.
- Respecter le consentement marketing et les obligations RGPD.
- Conserver un ton institutionnel, humain, rassurant et non agressif.
