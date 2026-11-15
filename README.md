# ViralForge

SaaS d'écriture de scripts pour vidéos courtes (TikTok, Reels, Shorts).

- **Landing** dark mode avec simulateur de score viral gratuit (analyse locale, sans appel d'API).
- **Dashboard** avec quatre outils d'écriture, gratuits et sans clé par défaut : Cloneur de
  Structure Virale, Anti-Dropoff, Générateur de Série 7 jours et Labo à hooks (10 accroches
  classées par le moteur du simulateur).
- **Video-to-Viral Blueprint** (en tête du dashboard, `POST /api/clone-video`) : lien TikTok,
  Reels ou Shorts + niche → potentiel viral estimé, déclencheurs psychologiques, découpage
  seconde par seconde (dit, écran, montage) et script prêt à tourner. Le site lit les
  informations publiques de la vidéo via oEmbed (titre ou légende, auteur, miniature) :
  YouTube et TikTok ; Instagram exige un jeton Meta et n'est pas lu. Il ne voit pas la vidéo
  elle-même. Sans information lisible, le plan part de la niche ; l'interface indique
  toujours d'où vient l'analyse.
- **Courbe de rétention** (`/dashboard/retention`, sans IA, illimitée) : pendant la frappe,
  chaque phrase reçoit un risque de décrochage et une courbe estime, seconde par seconde, la
  part des spectateurs encore là (`src/lib/retention.ts`). Calcul local et déterministe : une
  estimation tirée de la forme du texte, affichée aussi dans le simulateur de la landing, dans
  le Blueprint et en avant/après dans l'Anti-Dropoff.
- **Journal de performance** (`/dashboard/journal`) : le créateur note les vrais chiffres de
  ses vidéos (vues, rétention, durée, hook, plateforme, date) ; `src/lib/journal.ts` compare
  ses vidéos entre elles (médianes) et en tire ses tendances et une « formule » pour la
  prochaine vidéo. Gratuit : 5 vidéos et la première tendance. Pro : illimité.
- **Profil créateur** (niche, audience, ton, plateforme, style) injecté dans les prompts de
  tous les outils.
- **Passage en Pro** : checklist de premiers pas, solde rappelé après chaque génération,
  fenêtre « Passer en Pro » (ce que l'utilisateur a déjà fait, comparatif réel, prix par jour)
  ouverte quand les crédits ou le journal gratuit sont épuisés. Aucune fausse urgence.
- **Studio** : téléprompteur plein écran par-dessus la caméra, avec enregistrement vidéo dans
  le navigateur (MediaRecorder). Rien n'est envoyé au serveur.
- **Compte et sécurité** (`/dashboard/settings`) : changement de mot de passe (avec revérification
  de l'actuel), « mot de passe oublié » par e-mail, et résiliation de l'abonnement Pro. Connecté,
  la page d'accueil mène directement au tableau de bord.
- **Paiement Pro intégré** : le formulaire de paiement Whop s'ouvre dans une fenêtre, sur le site
  (`@whop/checkout`), e-mail pré-rempli pour activer le bon compte ; un lien vers la page Whop
  reste disponible en secours.
- **Application installable** (manifeste, icônes, plein écran sur iPhone) et navigation par
  onglets en bas d'écran sur téléphone.
- **Carte de score à partager** depuis le simulateur (image générée dans le navigateur).
- **Comptes et données** sur Supabase (Auth + Postgres avec RLS).
- **Plans** : `free` (3 crédits IA offerts, outils de mesure gratuits) et `pro` (illimité),
  activé par le webhook de paiement Whop.

Stack : Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide, Supabase, Zod. IA : Pollinations
(gratuit) ou Claude (SDK Anthropic, optionnel).

## Démarrage

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Sans `.env.local`, la landing et le simulateur fonctionnent déjà ; l'authentification et les
outils demandent la configuration ci-dessous.

## Configuration

### 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** : colle et exécute, dans l'ordre, les fichiers de `supabase/migrations/` :
   - `0001_init.sql` : tables `users`, `credits`, `saved_scripts`, règles RLS, trigger qui
     offre 3 crédits à l'inscription, fonctions `consume_credit` / `refund_credit` ;
   - `0002_pending_upgrades.sql` : plans Pro en attente (paiement reçu avant l'inscription) ;
   - `0003_self_serve_credits.sql` : débit des crédits sans clé secrète. Sans ce fichier ni
     la clé secrète, les générations fonctionnent mais ne sont pas décomptées ;
   - `0004_whop_webhook.sql` : traitement des paiements Whop dans la base (voir Paiement) ;
   - `0005_hooks_and_profiles.sql` : sauvegarde des accroches et profils créateurs ;
   - `0006_blueprint.sql` : sauvegarde des blueprints ;
   - `0007_video_journal.sql` : table `video_logs` du Journal de performance, avec la limite
     de 5 vidéos en gratuit appliquée par une règle RLS (`can_add_video_log`).
3. **Clé secrète (optionnelle)** : `SUPABASE_SERVICE_ROLE_KEY` permet de réserver le crédit
   avant la génération et sert au webhook LemonSqueezy. Ni les outils ni Whop n'en ont besoin.
   L'URL du projet et la clé « publishable » sont publiques : elles ont une valeur par
   défaut dans `src/lib/supabase/config.ts`. `NEXT_PUBLIC_SUPABASE_URL` et
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` ne servent qu'à viser un autre projet ; une valeur mal
   formée est ignorée.
4. **Authentication → URL Configuration** :
   - Site URL : `https://ton-domaine.com` (ou `http://localhost:3000` en local)
   - Redirect URLs : ajoute `https://ton-domaine.com/**` (couvre `/reset-password`, la
     cible du lien « mot de passe oublié »). Même si un lien de récupération retombe sur la
     Site URL, le site le rattrape (`src/components/auth/recovery-catcher.tsx`) et ouvre la
     page de choix d'un nouveau mot de passe (`/reset-password`).
5. **Authentication → Sign In / Providers → Email** : le service d'e-mail par défaut de
   Supabase n'écrit qu'aux membres du projet. Désactive « Confirm email », ou branche un
   SMTP (Resend, Brevo…) pour garder la confirmation.

   **Code de vérification à l'inscription (optionnel).** L'inscription gère un code à
   6 chiffres : si « Confirm email » est activé, l'app affiche un écran de saisie du code
   (`verifyOtp`, `src/components/auth/auth-form.tsx`). Pour que ce soit un *code* et non un
   lien, édite le modèle **Authentication → Email Templates → Confirm signup** pour inclure
   `{{ .Token }}`. Sans SMTP configuré, les codes ne partent pas : garde « Confirm email »
   désactivé jusque-là (l'inscription reste alors instantanée, sans code).

La confirmation par e-mail est gérée : si elle est activée, l'utilisateur reçoit un lien qui
revient sur `/auth/callback`.

### 2. IA

**Par défaut, rien à configurer.** Les outils utilisent l'API publique « Classic » de
[Pollinations](https://github.com/pollinations/pollinations/blob/main/APIDOCS.md) (modèle
GPT-OSS 20B), appelée depuis le serveur (`src/lib/ai/free-engine.ts`) : gratuite, sans clé ni
compte. Sa limite de débit s'applique par adresse IP, donc à tout le site : une génération à
la fois, environ 30 secondes entre deux. Quand elle est atteinte, le serveur attend le délai
demandé puis relance ; au-delà, l'utilisateur est invité à réessayer, sans perdre de crédit.

C'est un service gratuit « au mieux » : pas de garantie de disponibilité, et ses conditions
peuvent changer. Il refuse les appels faits directement depuis un navigateur (vérification
anti-robot), d'où le passage par le serveur.

**Option : Claude.** Pour une meilleure qualité d'écriture et sans file d'attente, crée une
clé sur [platform.claude.com](https://platform.claude.com/settings/keys) et renseigne
`ANTHROPIC_API_KEY` : les outils passent alors par Claude Haiku 5.5 (moins d'un centime par
génération, facturé à l'usage). `ANTHROPIC_MODEL=claude-sonnet-5-5` privilégie encore la
qualité, pour environ vingt fois plus cher.

### 3. Paiement

Tous les boutons « Passer en Pro » ouvrent le **paiement intégré** (`@whop/checkout`,
`src/components/checkout-embed.tsx`) : le formulaire Whop s'affiche dans une fenêtre sur le site,
sans nouvel onglet, avec l'e-mail du compte pré-rempli. Le plan vient de `CHECKOUT_URL`
(`src/lib/plans.ts`) ; `NEXT_PUBLIC_CHECKOUT_URL` le remplace sans toucher au code. Si le cadre
ne se charge pas, un lien vers la page de paiement Whop reste proposé.

**Résiliation en un clic (optionnel).** La page Paramètres propose « Résilier mon abonnement ».
Pour qu'elle agisse directement via l'API Whop (sans que le client aille sur Whop), renseigne
`WHOP_API_KEY` (clé serveur Whop avec la permission `membership:cancel`) : la résiliation est alors
programmée pour la fin de la période. Sans cette clé, le bouton renvoie vers la gestion sur Whop.

**Activation du plan Pro.** Whop prévient le site à chaque paiement (webhook). La route
`src/app/api/webhooks/whop/route.ts` transmet la notification telle quelle à la fonction SQL
`handle_whop_webhook` (migration `0004`), qui vérifie la signature avec le secret du webhook,
passe le compte en `pro`, puis le repasse en `free` à la fin de l'abonnement. Aucune variable
d'environnement n'est nécessaire.

1. Dans Whop → **Developer → Webhooks**, crée un webhook (ou via l'API, `POST /webhooks`) :
   - URL : `https://ton-domaine.com/api/webhooks/whop`
   - Événements : `payment.succeeded`, `membership.activated`, `membership.deactivated`
2. Enregistre son secret (commence par `ws_`) dans la base, depuis le SQL Editor :

   ```sql
   insert into public.app_secrets (name, value) values ('whop_webhook_secret', 'ws_…')
   on conflict (name) do update set value = excluded.value, updated_at = now();
   ```

Le compte est retrouvé par l'e-mail utilisé au paiement : le client doit payer avec l'adresse
de son compte ViralForge. S'il paie avant de s'inscrire, son plan Pro l'attend et s'applique
à la création du compte. Seuls les paiements du plan présent dans `CHECKOUT_URL` sont pris
en compte. En dernier recours, le plan se change à la main : Supabase → Table Editor →
`users` → colonne `plan`.

Tant que la confirmation d'e-mail est désactivée dans Supabase, une adresse n'est pas
vérifiée à l'inscription : réactive-la (avec un SMTP) avant de vendre à grande échelle.

**LemonSqueezy (alternative).** Si `NEXT_PUBLIC_CHECKOUT_URL` pointe vers LemonSqueezy,
l'activation est automatique. Dans LemonSqueezy → **Settings → Webhooks** :

- URL : `https://ton-domaine.com/api/webhooks/lemonsqueezy`
- Secret : la même valeur que `LEMONSQUEEZY_WEBHOOK_SECRET`
- Événements : `order_created`, `order_refunded` et tous les `subscription_*`
  (hors `subscription_payment_*`).

Le lien est alors complété avec l'identifiant du compte, que le webhook relit pour passer le
bon utilisateur en `pro`. Un abonnement résilié garde l'accès jusqu'à son expiration.

## Architecture

```
supabase/migrations/                Schéma, RLS, triggers, crédits, plans en attente
src/
├── middleware.ts                   Session Supabase + protection de /dashboard
├── app/
│   ├── (marketing)/                Landing (statique) et page Tarifs
│   ├── (auth)/                     Connexion, inscription, server actions
│   ├── auth/                       Callback e-mail, déconnexion
│   ├── dashboard/                  Vue d'ensemble, outils, courbe, journal, scripts sauvegardés
│   └── api/
│       ├── generate/               Génération des outils (cœur : lib/generation-handler.ts)
│       ├── clone-video/            Video-to-Viral Blueprint
│       └── webhooks/               Passage free ↔ pro (whop, lemonsqueezy)
├── components/
│   ├── ui/                         Bouton, champs, carte, logo
│   ├── marketing/                  Sections de la landing, simulateur
│   └── dashboard/                  Navigation, outils, résultats, profil, studio/
├── lib/
│   ├── supabase/                   Clients navigateur, serveur, admin, middleware
│   ├── ai/                         Prompts, générateur gratuit, Claude
│   ├── profile.ts · studio.ts      Profil créateur, passage d'un script vers le Studio
│   ├── retention.ts                Courbe de rétention estimée (sans IA)
│   ├── journal.ts                  Journal de performance : validation et tendances
│   ├── handoff.ts                  Passage d'un brouillon d'un outil à l'autre
│   ├── score-card.ts               Image de score à partager
│   ├── tools.ts                    Schémas Zod d'entrée et de sortie des outils IA
│   ├── viral-score.ts              Moteur du simulateur
│   ├── credits.ts · plans.ts · auth.ts · utils.ts
└── types/database.ts               Types de la base
```

### Crédits

Une génération qui échoue ne coûte jamais de crédit. En `pro`, aucun crédit n'est consommé.

- **Avec la clé secrète** : le crédit est réservé **avant** l'appel au modèle par un `UPDATE`
  SQL atomique (`consume_credit`), et rendu si la génération échoue. La consommation reste
  bornée même si un utilisateur envoie plusieurs requêtes en parallèle.
- **Sans** : le solde est vérifié avant, et le crédit débité après une génération réussie,
  avec la session de l'utilisateur (`spend_own_credit`, migration 0003).

Le navigateur ne peut que lire `users.plan` et `credits.balance`, et le solde ne peut que
baisser.

### Appels au modèle

Chaque outil impose un format de sortie JSON (sorties structurées, schémas Zod de
`src/lib/tools.ts`), ce qui permet à l'interface d'afficher des résultats riches : battements
côte à côte, passages surlignés, frise de 7 jours. Les prompts sont dans
`src/lib/ai/prompts.ts`. Le générateur gratuit reçoit le même schéma, converti en JSON Schema
dans son prompt ; sa réponse est validée par Zod et relancée si elle est mal formée.

## Déploiement

Sur Vercel : importe le dépôt et renseigne les variables de `.env.example`. Les variables
`NEXT_PUBLIC_*` sont figées au build : redéploie après les avoir modifiées.

`/api/generate` déclare `maxDuration = 300` (secondes), ce qui suppose Fluid Compute, activé
par défaut sur les projets Vercel récents.

## Sécurité : version de Next.js

Le projet est sur Next.js 14.2.35, dernière version de la branche 14, qui n'est plus
maintenue : `npm audit` y signale des failles corrigées uniquement dans les versions
suivantes. L'optimiseur d'images, concerné par les plus graves, est désactivé dans
`next.config.mjs`. Avant une mise en production, passe sur une version maintenue :

```bash
npx @next/codemod@latest upgrade latest
```

## Scripts

| Commande        | Rôle                          |
| --------------- | ----------------------------- |
| `npm run dev`   | Serveur de développement      |
| `npm run build` | Build de production           |
| `npm run start` | Sert le build de production   |
| `npm run lint`  | ESLint                        |
