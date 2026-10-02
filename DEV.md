# KOLTZ — notes de dev (landing SQUAD)

Site 100 % statique, sans framework ni build : `index.html` + `assets/`.

| Fichier | Rôle |
|---|---|
| `assets/css/koltz.css` | Tout le style (mobile-first, palette Void/Orange/Volt/Plasma, polices auto-hébergées) |
| `assets/js/plans.js` | **Source unique des forfaits** (noms, data, prix, Europe) |
| `assets/js/koltz.js` | Nav mobile, curseur squad, partage, tunnel de pré-inscription (Supabase), modale légale |
| `assets/fonts/` | Unbounded, Inter, JetBrains Mono (woff2 latin, variables) |
| `assets/img/` | Wordmark SVG (provisoire), favicon, apple-touch-icon |
| `vercel.json` | En-têtes de sécurité, CSP stricte **sans `unsafe-inline`** |
| `supabase/schema-suggestion.sql` | Colonnes squad / code créateur + RLS insert-only (**non appliqué**) |

Règle CSP : aucun `style="…"`, aucun `<style>`, aucun `<script>` inline, aucun `onclick`. Tout passe par les fichiers.

## Renommer les forfaits
1. Modifier `name` dans `assets/js/plans.js` (ne jamais changer `id`, c'est la valeur stockée en base).
2. `node scripts/rename-plans.mjs` (met à jour le texte de repli HTML, utile SEO / sans JS).

## Tests
```bash
npm i --no-save puppeteer-core        # une fois
node tests/serve.cjs &                # http://localhost:8099, applique vercel.json, 404.html
CHROME=/usr/bin/google-chrome node tests/e2e.cjs
```
Supabase est simulé (interception réseau) : aucune donnée réelle n'est écrite. Un scénario « real » vérifie le message d'erreur face au vrai projet.

`.vercelignore` exclut `tests/`, `scripts/`, `supabase/` et ce fichier du déploiement.
