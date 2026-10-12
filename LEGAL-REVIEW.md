# ⚠️ BROUILLON À VALIDER — Textes juridiques KOLTZ (phase de pré-inscription)

> **Statut : brouillon rédigé sans avocat, à faire relire par un juriste avant toute mise en production.**
> Ce n'est pas un conseil juridique. Branche : `feat/legal-draft` (ne pas fusionner sans validation de Ry).
> Les textes en ligne sont dans `assets/js/koltz.js` (objet `LEGAL`) et s'ouvrent depuis le pied de page.

## Ce qui a changé par rapport aux textes précédents
| Avant | Après | Pourquoi |
|---|---|---|
| CGV d'un service vendu (« Prix TTC, garantis 12 mois », « Résiliation depuis l'espace client ») | **Conditions de la pré-inscription** : gratuite, sans paiement, sans engagement, offres indicatives | Aucun service n'est vendu ; promesse de prix non tenable et espace client inexistant |
| Confidentialité générique (facturation, consommation) | Politique dédiée à la waitlist : données, finalités, **base légale = consentement**, conservation, destinataires, transferts, droits, CNIL, âge | Art. 13 RGPD |
| Cookies : « cookies techniques (session, préférences) » | **Aucun cookie ni stockage navigateur** (vérifié par test automatique), polices auto-hébergées, Supabase/jsDelivr/Vercel décrits | Le texte précédent était inexact |
| Mentions : siège « Paris, France », directeur « Ryadh N. » | Placeholders `[à compléter]` : capital, adresse du siège, TVA, directeur de la publication (nom complet), téléphone de l'hébergeur | LCEN art. 6-III : informations obligatoires, ne pas inventer |
| Formulaire : simple phrase d'information | **Case de consentement obligatoire, non pré-cochée** + liens Confidentialité / Conditions ; version du texte (`2026-10-pre1`) enregistrée en base avec l'inscription | Preuve du consentement (art. 7 RGPD) |

## Placeholders à remplir (recherche `[à compléter` dans `assets/js/koltz.js`)
- Date de mise en ligne (4 textes)
- Capital social, adresse complète du siège, n° de TVA intracommunautaire
- Directeur de la publication : prénom + nom complets et fonction
- Téléphone de Vercel Inc. (obligation LCEN pour l'hébergeur)
- Région d'hébergement Supabase (recommandé : Paris `eu-west-3`, voir `supabase/SETUP.md`)
- Encadrement des transferts hors UE (DPF / clauses contractuelles types) : à vérifier dans les DPA de Vercel et Supabase
- Durée de conservation (proposition : jusqu'au lancement, max 24 mois après l'inscription)
- Âge minimum : 15 ans (seuil du consentement numérique en France) ou 18 ans (âge pour souscrire un forfait)

## Points d'attention pour le juriste
1. Les adresses `contact@koltz.fr` et `privacy@koltz.fr` doivent exister et être relevées (droits RGPD : réponse sous 1 mois).
2. Registre des traitements (art. 30) et DPA signés avec Vercel et Supabase.
3. Concours « Hall of Fame » : règlement à rédiger avant ouverture (aucun lot promis à ce stade).
4. Codes créateurs : mention « collaboration commerciale » des créateurs (loi n° 2023-451 influenceurs), déjà rappelée sur la page.
5. Limite connue : en cas de réinscription avec un email déjà présent, le site indique « déjà pré-inscrit » (une personne pourrait ainsi savoir qu'un email est inscrit). Risque faible ; alternative : message neutre identique dans tous les cas.
6. Les CGV / fiche d'information standardisée / récapitulatif contractuel du **service** seront à rédiger au lancement avec l'opérateur hôte.

---

## Textes complets (copie lisible de ce qui est dans le site)

### Mentions légales  (`mentions`)

*Dernière mise à jour : [à compléter : date de mise en ligne].*

#### Éditeur du site
KOLTZ MOBILE SAS, société par actions simplifiée au capital de [à compléter : capital social] €  
Immatriculée au RCS de Paris sous le numéro 988 421 770  
Siège social : [à compléter : adresse complète du siège], Paris, France  
N° de TVA intracommunautaire : [à compléter]  
Email : contact@koltz.fr

#### Directeur de la publication
[à compléter : prénom et nom complets du représentant légal], en qualité de [à compléter : fonction, ex. Président].

#### Hébergement du site
Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Site : vercel.com. Téléphone : [à compléter : à vérifier auprès de Vercel].

#### Hébergement des données de pré-inscription
Supabase Inc. (base de données), région d'hébergement : [à compléter : région choisie, ex. Union européenne, Paris].

#### Activité
KOLTZ est un projet d'offre mobile en cours de lancement. À ce jour, aucun service de téléphonie n'est commercialisé ni fourni sur ce site : il permet uniquement de se pré-inscrire pour être informé du lancement.

#### Propriété intellectuelle
Les textes, visuels, logos et éléments graphiques du site sont la propriété de KOLTZ MOBILE SAS ou utilisés avec autorisation. Toute reproduction sans accord préalable est interdite. Les noms de forfaits affichés sont provisoires.

#### Contact
contact@koltz.fr

### Conditions de la pré-inscription  (`cgv`)

*Dernière mise à jour : [à compléter : date de mise en ligne].*

#### Objet
Les présentes conditions encadrent la pré-inscription gratuite à KOLTZ (« Saison 0 ») sur www.koltz.fr, éditée par KOLTZ MOBILE SAS. KOLTZ n'est pas encore lancé : **aucun forfait mobile n'est vendu ni fourni à ce stade**.

#### Ce que la pré-inscription est
Une inscription gratuite, sans paiement et sans engagement, qui permet d'être prévenu du lancement, de réserver un pseudo de squad et d'indiquer un code créateur. Elle ne constitue ni un contrat d'abonnement, ni une commande, ni une réservation de numéro.

#### Offres et prix affichés
Les forfaits, volumes de données, prix et contenus présentés sur le site sont **indicatifs et prévisionnels**. Ils pourront évoluer d'ici le lancement, notamment selon les conditions de notre opérateur hôte. Les montants de la remise squad, de l'XP, des récompenses et du bonus « Founder » ne sont pas encore fixés et seront annoncés au lancement.

#### Squads, XP et codes
Le code squad généré lors de la pré-inscription sert uniquement à regrouper des personnes inscrites. Le code créateur saisi est enregistré tel quel et vérifié au lancement ; un code non reconnu sera ignoré. Les avantages liés aux squads, à l'XP, au parrainage et aux codes créateurs seront décrits dans les conditions de l'offre au lancement. Tout concours (ex. « Hall of Fame ») fera l'objet d'un règlement spécifique publié avant son ouverture.

#### Au lancement
Avant toute souscription, tu recevras les conditions générales de vente et d'utilisation du service, la fiche d'information standardisée et le récapitulatif contractuel prévus par le Code de la consommation. Tu seras libre de souscrire ou non. Le droit de rétractation de 14 jours s'appliquera aux souscriptions à distance, dans les conditions prévues par la loi.

#### Annulation de la pré-inscription
Tu peux annuler ta pré-inscription à tout moment, sans frais ni justification, en écrivant à contact@koltz.fr. KOLTZ peut mettre fin au programme de pré-inscription ; les personnes inscrites en seront informées par email.

#### Responsabilité
KOLTZ s'efforce de maintenir le site accessible et exact, sans pouvoir garantir une disponibilité permanente. La pré-inscription ne donne droit à aucune indemnité si l'offre évolue, est reportée ou n'est pas lancée.

#### Droit applicable
Les présentes conditions sont soumises au droit français. En cas de litige, tu peux contacter contact@koltz.fr ; à défaut d'accord, les tribunaux compétents sont ceux prévus par la loi.

### Politique de confidentialité  (`privacy`)

*Dernière mise à jour : [à compléter : date de mise en ligne]. Version du texte : 2026-10-pre1.*

#### Responsable du traitement
KOLTZ MOBILE SAS, RCS Paris 988 421 770, [à compléter : adresse du siège]. Contact données personnelles : privacy@koltz.fr.

#### Données collectées lors de la pré-inscription
Email, prénom ou pseudo, forfait qui t'intéresse, et si tu les renseignes : choix de squad (créer ou rejoindre), nom et code de squad, code créateur. Ainsi que la date d'inscription et la version du texte de consentement accepté. Aucune donnée bancaire, aucune pièce d'identité, aucun numéro de téléphone.

#### Finalités
1) Te prévenir par email du lancement de KOLTZ et des étapes de la Saison 0 ; 2) gérer ta pré-inscription (squad, code créateur) et la reprendre si tu souscris au lancement ; 3) établir des statistiques internes anonymes (nombre d'inscrits, forfaits préférés).

#### Base légale
Ton **consentement** (article 6.1.a du RGPD), donné en cochant la case du formulaire. Tu peux le retirer à tout moment, aussi facilement que tu l'as donné, sans que cela affecte la licéité du traitement effectué avant le retrait.

#### Durée de conservation
Jusqu'au lancement commercial de KOLTZ et au plus tard [à compléter : durée, proposition 24 mois] après ton inscription, ou jusqu'au retrait de ton consentement si tu le retires avant. Si tu souscris, tes données sont ensuite traitées selon la politique de confidentialité du service.

#### Destinataires
L'équipe KOLTZ habilitée uniquement. Prestataires techniques agissant pour notre compte : Supabase Inc. (hébergement de la base de données, région : [à compléter]) et Vercel Inc. (hébergement du site, journaux techniques). La bibliothèque technique supabase-js est chargée depuis le réseau jsDelivr, qui reçoit ton adresse IP comme tout serveur web. Tes données ne sont jamais vendues ni louées.

#### Transferts hors Union européenne
Vercel et Supabase sont des sociétés américaines. Les transferts éventuels sont encadrés par [à compléter : à vérifier, ex. Data Privacy Framework UE–États-Unis et/ou clauses contractuelles types de la Commission européenne].

#### Tes droits
Accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement, et directives sur le sort de tes données après ton décès. Pour les exercer : privacy@koltz.fr (réponse sous un mois). Tu peux aussi introduire une réclamation auprès de la CNIL (www.cnil.fr, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07).

#### Âge minimum
La pré-inscription est réservée aux personnes âgées d'au moins [à compléter : 15 ou 18] ans.

#### Sécurité
Connexion chiffrée (HTTPS), base de données en écriture seule depuis le site (personne ne peut lire la liste des inscrits depuis le site), accès au tableau de bord réservé à l'équipe.

### Cookies et traceurs  (`cookies`)

*Dernière mise à jour : [à compléter : date de mise en ligne].*

#### Aucun cookie, aucun traceur
Ce site **ne dépose aucun cookie** et n'utilise **aucun stockage dans ton navigateur** (ni localStorage, ni sessionStorage). Il n'y a ni mesure d'audience, ni publicité, ni pixel de réseau social, ni outil de suivi. C'est pour ça qu'il n'y a pas de bandeau cookies.

#### Ce que ton navigateur charge
Polices de caractères (Unbounded, Inter, JetBrains Mono) hébergées directement sur koltz.fr : aucune requête vers Google Fonts. Bibliothèque supabase-js chargée depuis cdn.jsdelivr.net (contrôlée par empreinte d'intégrité). Requêtes vers notre base Supabase : au chargement de la page pour le compteur d'inscrits, et à l'envoi du formulaire de pré-inscription. Comme tout serveur web, Vercel, jsDelivr et Supabase reçoivent ton adresse IP et des informations techniques (navigateur, date) dans leurs journaux.

#### Partage
Les boutons de partage (WhatsApp, SMS, partage natif) ne chargent aucun script tiers : ils ouvrent simplement l'application concernée quand tu cliques.

#### Si cela change
Si nous ajoutons un jour un outil de mesure d'audience ou un cookie non essentiel, nous te demanderons ton accord avant, et cette page sera mise à jour.

### Texte de la case à cocher (formulaire, étape 2)
> J'accepte que KOLTZ utilise mon email et mes réponses pour me prévenir du lancement et gérer ma pré-inscription (squad, code créateur). Je peux retirer mon accord à tout moment. *

Sous la case : « Pas de pub, pas de revente. Détails : Confidentialité · Conditions de la pré-inscription ».
