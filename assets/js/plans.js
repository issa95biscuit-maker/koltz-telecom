/*
 * KOLTZ — source unique des forfaits.
 *
 * Renommer un forfait (ex. noms SPAWN / RUSH / CLUTCH / LÉGENDE après vérification INPI/EUIPO) :
 *   1. changer `name` ci-dessous ;
 *   2. lancer `node scripts/rename-plans.mjs` pour mettre à jour le texte de repli dans index.html
 *      (utile pour le SEO et sans JavaScript).
 * Ne pas changer `id` : c'est la valeur enregistrée dans Supabase (colonne `forfait`).
 */
window.KOLTZ_PLANS = [
  { id: 'mini',     name: 'Mini',     data: '30 Go',  price: '6,99 €',  europe: '5 Go en Europe' },
  { id: 'max',      name: 'Max',      data: '100 Go', price: '11,99 €', europe: '20 Go en Europe' },
  { id: 'ultra',    name: 'Ultra',    data: '200 Go', price: '14,99 €', europe: '40 Go Europe & DOM' },
  { id: 'infinity', name: 'Infinity', data: '300 Go', price: '19,99 €', europe: '100 Go dans 75 pays' }
];
