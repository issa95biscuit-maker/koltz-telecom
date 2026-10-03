# Remettre la pré-inscription en marche (Supabase) — guide pas à pas

Temps estimé : 10 minutes. Gratuit (plan Free). Aucune carte bancaire requise.
Pourquoi : l'ancien projet `qzjqmksizkzkhvgrejvx` ne répond plus (supprimé ou en pause). Tant qu'il n'est pas remplacé,
le site affiche honnêtement « ta pré-inscription n'a pas pu être enregistrée ».

> Les libellés exacts de l'interface Supabase peuvent légèrement changer ; l'ordre des étapes reste le même.

## 0. Avant tout : l'ancien projet est-il seulement en pause ?
1. Va sur https://supabase.com/dashboard et connecte-toi avec le compte qui avait créé KOLTZ.
2. Si un projet KOLTZ apparaît avec « Paused » → clique **Restore project**, attends 2-3 min, puis passe directement à l'étape 2
   (l'URL et la clé ne changent pas, rien à modifier dans le site, mais lance quand même le SQL de l'étape 2).
3. Sinon → étape 1.

## 1. Créer le projet
1. **New project**.
2. Organization : la tienne. **Name** : `koltz`.
3. **Database password** : clique *Generate a password* et range-le dans ton gestionnaire de mots de passe (ne l'envoie à personne, il ne va PAS dans le site).
4. **Region** : *West EU (Paris)* (`eu-west-3`) — données en France, plus simple pour le RGPD.
5. Laisse l'option **Data API** activée (c'est elle qui permet au site d'écrire).
6. **Create new project**, attends ~2 min.

## 2. Créer les tables et la sécurité (copier-coller)
1. Menu de gauche → **SQL Editor** → **New query**.
2. Ouvre `supabase/schema-suggestion.sql` (dans le repo), copie **tout**, colle, clique **Run**.
   Résultat attendu : `Success. No rows returned` (des « NOTICE … skipping » sont normaux).
3. Vérifie : menu **Table Editor** → tu dois voir `waitlist` et `abonnes`, avec le badge **RLS enabled**.
4. Quand la case de consentement sera en ligne (branche `feat/legal-draft`), relance le bloc **6. Consentement obligatoire**
   (décommente-le, c'est-à-dire supprime les `-- ` en début de ligne, puis Run).

## 3. Récupérer l'URL et la clé publique
1. En haut de la page du projet, bouton **Connect** (ou **Project Settings → Data API**) → copie la **Project URL**
   (forme `https://xxxxxxxxxxxx.supabase.co`).
2. **Project Settings → API Keys** → copie la **Publishable key** (commence par `sb_publishable_`).
   ⚠️ NE PAS copier la *Secret key* (`sb_secret_…`) ni la `service_role` : elles ne doivent jamais aller dans le site.

## 4. Les coller dans le site (2 lignes)
Fichier **`assets/js/config.js`** :
```js
window.KOLTZ_CONFIG = {
  supabaseUrl: 'https://xxxxxxxxxxxx.supabase.co',   // ← Project URL
  supabaseKey: 'sb_publishable_xxxxxxxxxxxxxxxx',    // ← Publishable key
  site: 'https://www.koltz.fr/'
};
```
C'est tout : `koltz.js` lit ces valeurs, et la CSP (`vercel.json`) autorise déjà `https://*.supabase.co`.
Sur GitHub : ouvre le fichier sur la branche, icône crayon ✏️, remplace les 2 valeurs, **Commit changes**.

## 5. Tester (sur une preview Vercel, pas en prod)
1. Ouvre la preview, va à « Ta squad t'attend », inscris-toi avec ton email.
2. Supabase → **Table Editor → waitlist** : ta ligne apparaît. Idem dans **abonnes** (prénom, forfait, squad, code créateur).
3. Réinscris-toi avec le même email : le site doit dire « Cet email est déjà pré-inscrit » (pas de doublon en base).

## Ce que la sécurité garantit (vérifié sur un PostgreSQL local avec les rôles Supabase)
| Action avec la clé publique | Résultat |
|---|---|
| Ajouter une inscription valide | ✅ accepté |
| Même email une 2e fois | ❌ refusé (doublon), le site l'affiche comme « déjà inscrit » |
| Lire la liste des emails (SELECT) | ❌ refusé |
| Modifier / supprimer des lignes | ❌ refusé |
| Écrire `statut`, `points`, `created_at` | ❌ refusé (valeurs fixées par la base) |
| Forfait inconnu, code squad mal formé, email en majuscules / trop long | ❌ refusé (contraintes) |

Pour consulter ou exporter les inscrits : uniquement depuis le dashboard Supabase (Table Editor → Export CSV), jamais depuis le site.

## RGPD (rappel)
- Durée de conservation annoncée dans la politique de confidentialité (brouillon) : à respecter (supprimer les inscrits non convertis à l'échéance).
- Demande de suppression reçue sur l'email de contact : Table Editor → filtre sur l'email → supprimer la ligne dans `waitlist` et `abonnes`.
