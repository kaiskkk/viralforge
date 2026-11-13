# ViralForge

SaaS d'écriture de scripts pour vidéos courtes (TikTok, Reels, Shorts).

- **Landing** dark mode avec simulateur de score viral gratuit (analyse locale, sans appel d'API).
- **Dashboard** avec trois outils branchés sur Claude via `POST /api/generate` :
  Cloneur de Structure Virale, Anti-Dropoff, Générateur de Série 7 jours.
- **Comptes et données** sur Supabase (Auth + Postgres avec RLS).
- **Plans** : `free` (3 crédits offerts) et `pro` (illimité), activé par webhook LemonSqueezy.

Stack : Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide, Supabase, SDK Anthropic, Zod.

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
2. **SQL Editor** : colle et exécute `supabase/migrations/0001_init.sql`.
   Il crée les tables `users`, `credits`, `saved_scripts`, les règles RLS, le trigger qui
   offre 3 crédits à l'inscription et les fonctions `consume_credit` / `refund_credit`.
3. **Project Settings → API Keys** : copie la clé secrète dans `SUPABASE_SERVICE_ROLE_KEY`.
   L'URL du projet et la clé « publishable » sont publiques : elles ont une valeur par
   défaut dans `src/lib/supabase/config.ts`. `NEXT_PUBLIC_SUPABASE_URL` et
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` ne servent qu'à viser un autre projet ; une valeur mal
   formée est ignorée.
4. **Authentication → URL Configuration** :
   - Site URL : `https://ton-domaine.com` (ou `http://localhost:3000` en local)
   - Redirect URLs : ajoute `https://ton-domaine.com/**`
5. **Authentication → Sign In / Providers → Email** : le service d'e-mail par défaut de
   Supabase n'écrit qu'aux membres du projet. Désactive « Confirm email », ou branche un
   SMTP (Resend, Brevo…) pour garder la confirmation.

La confirmation par e-mail est gérée : si elle est activée, l'utilisateur reçoit un lien qui
revient sur `/auth/callback`.

### 2. Anthropic

Crée une clé sur [console.anthropic.com](https://console.anthropic.com) et renseigne
`ANTHROPIC_API_KEY`. Le modèle par défaut est `claude-sonnet-5-5` ; `ANTHROPIC_MODEL` permet
d'en changer (`claude-haiku-5-5` est plus rapide et moins cher).

### 3. Paiement

Tous les boutons « Passer en Pro » du site ouvrent le lien de paiement Whop défini dans
`src/lib/plans.ts` (`CHECKOUT_URL`). Pour le remplacer sans toucher au code, renseigne
`NEXT_PUBLIC_CHECKOUT_URL`.

**Activation du plan Pro.** Un paiement sur Whop ne passe pas le compte en `pro` tout seul :
il n'y a pas encore de webhook Whop. En attendant, deux options :

- à la main : Supabase → Table Editor → `users` → passe `plan` à `pro` sur la ligne du client
  (retrouve-le par son e-mail) ;
- automatiquement : ajoute un webhook Whop sur le modèle de
  `src/app/api/webhooks/lemonsqueezy/route.ts` (vérifier la signature, retrouver le compte
  par e-mail, mettre à jour `users.plan`).

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
supabase/migrations/0001_init.sql   Schéma, RLS, triggers, fonctions de crédits
src/
├── middleware.ts                   Session Supabase + protection de /dashboard
├── app/
│   ├── (marketing)/                Landing (statique) et page Tarifs
│   ├── (auth)/                     Connexion, inscription, server actions
│   ├── auth/                       Callback e-mail, déconnexion
│   ├── dashboard/                  Vue d'ensemble, 3 outils, scripts sauvegardés
│   └── api/
│       ├── generate/               Appel à Claude + gestion des crédits
│       └── webhooks/lemonsqueezy/  Passage free ↔ pro
├── components/
│   ├── ui/                         Bouton, champs, carte, logo
│   ├── marketing/                  Sections de la landing, simulateur
│   └── dashboard/                  Sidebar, formulaires et résultats des outils
├── lib/
│   ├── supabase/                   Clients navigateur, serveur, admin, middleware
│   ├── anthropic/                  Client, prompts, génération structurée
│   ├── tools.ts                    Schémas Zod d'entrée et de sortie des 3 outils
│   ├── viral-score.ts              Moteur du simulateur
│   ├── credits.ts · plans.ts · auth.ts · utils.ts
└── types/database.ts               Types de la base
```

### Crédits

`/api/generate` réserve un crédit **avant** d'appeler le modèle, par un `UPDATE` SQL atomique,
et le rembourse si la génération échoue. La dépense d'API reste bornée même si un utilisateur
envoie plusieurs requêtes en parallèle. En `pro`, aucun crédit n'est consommé.

Le navigateur ne peut que lire `users.plan` et `credits.balance` : ils ne sont modifiés que
côté serveur avec la clé `service_role`.

### Appels à Claude

Chaque outil impose un format de sortie JSON (sorties structurées, schémas Zod de
`src/lib/tools.ts`), ce qui permet à l'interface d'afficher des résultats riches : battements
côte à côte, passages surlignés, frise de 7 jours. Les prompts sont dans
`src/lib/anthropic/prompts.ts`.

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
