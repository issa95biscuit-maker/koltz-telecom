/* KOLTZ — landing « SQUAD » (pré-lancement). Aucun script inline : compatible CSP stricte. */
(function () {
  'use strict';

  // ══ CONFIG ══
  // Valeurs dans assets/js/config.js (une ligne à changer pour pointer vers un autre projet Supabase)
  var CFG = window.KOLTZ_CONFIG || {};
  var SUPA_URL = CFG.supabaseUrl, SUPA_KEY = CFG.supabaseKey;
  var SITE = CFG.site || 'https://www.koltz.fr/';
  var PLANS = {};
  (window.KOLTZ_PLANS || []).forEach(function (p) { PLANS[p.id] = p; });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function setT(el, t) { if (typeof el === 'string') el = document.getElementById(el); if (el) el.textContent = t; }

  // ══ SUPABASE (client créé seulement si la lib est chargée) ══
  // persistSession: false → aucun stockage navigateur (pas de cookie ni localStorage)
  var supa = null;
  try { if (SUPA_URL && SUPA_KEY && window.supabase && window.supabase.createClient) supa = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); } catch (e) { supa = null; }

  function saveWaitlist(email, source) {
    if (!supa || !email) return Promise.resolve(false);
    // INSERT simple (aucun droit de lecture requis). Email déjà présent (23505) = déjà sur la liste = succès.
    return supa.from('waitlist').insert([{ email: email, source: source || 'site' }])
      .then(function (r) { if (!r.error || r.error.code === '23505') return true; console.warn('waitlist:', r.error.message); return false; })
      .catch(function (e) { console.warn('waitlist:', e && e.message); return false; });
  }
  function saveAbonne(d) {
    if (!supa) return Promise.resolve(false);
    // Uniquement les colonnes autorisées pour anon (statut, points, dates : valeurs par défaut côté base).
    // Pas de .select() : fonctionne avec une RLS « insert only ».
    return supa.from('abonnes').insert([{
      email: d.email, prenom: d.prenom, forfait: d.forfait,
      squad_mode: d.squadMode, squad_nom: d.squadNom, squad_code: d.squadCode, code_createur: d.codeCreateur
    }]).then(function (r) {
      if (!r.error) return true;
      if (r.error.code === '23505') return 'dup'; // email déjà pré-inscrit : la 1re inscription est conservée
      console.warn('abonnes:', r.error.message); return false;
    }).catch(function (e) { console.warn('abonnes:', e && e.message); return false; });
  }
  function loadWaitlistCount() {
    if (!supa) return;
    supa.from('waitlist').select('*', { count: 'exact', head: true }).then(function (r) {
      var n = r && r.count;
      if (n && n > 0) { setT('waitlist-count', n.toLocaleString('fr-FR')); var p = document.getElementById('waitlist-proof'); if (p) p.hidden = false; }
    }).catch(function () {});
  }

  // ══ NOMS DE FORFAITS (source unique : assets/js/plans.js) ══
  function hydratePlans() {
    $$('[data-plan][data-field]').forEach(function (el) {
      var p = PLANS[el.getAttribute('data-plan')], f = el.getAttribute('data-field');
      if (p && p[f] != null) el.textContent = p[f];
    });
  }

  // ══ TOAST ══
  var toastT;
  function toast(m) { var t = document.getElementById('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  // ══ NAV MOBILE ══
  function initNav() {
    var b = document.getElementById('burger'), l = document.getElementById('nav-links');
    if (!b || !l) return;
    function set(open) { b.setAttribute('aria-expanded', String(open)); l.classList.toggle('open', open); document.body.classList.toggle('menu-open', open); }
    b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
    l.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && l.classList.contains('open')) { set(false); b.focus(); } });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (m) { if (m.matches) set(false); });
  }

  // ══ PRIX SQUAD (montants à annoncer : on ne calcule pas de faux prix) ══
  function initSquadCalc() {
    var r = document.getElementById('squad-size'); if (!r) return;
    var bar = $$('#squad-bar i'), out = document.getElementById('squad-out'), msg = document.getElementById('squad-msg'), card = document.getElementById('squadcalc');
    function upd() {
      var n = +r.value; setT(out, String(n));
      bar.forEach(function (i, k) { i.classList.toggle('on', k < n); });
      r.setAttribute('aria-valuetext', n + ' membre' + (n > 1 ? 's' : '') + ' sur 5');
      var left = 5 - n;
      if (n === 1) setT(msg, 'Solo\u00a0: tu paies le prix solo. Ajoute des potes pour activer la remise squad.');
      else if (left > 0) setT(msg, 'Squad à ' + n + '/5. Encore ' + left + ' pote' + (left > 1 ? 's' : '') + ' pour la compléter. Remise\u00a0: à annoncer au lancement.');
      else setT(msg, 'Squad complète, 5/5. Remise maximale pour chacun\u00a0: montant annoncé au lancement.');
      var full = n === 5;
      if (full && !card.classList.contains('full')) { card.classList.add('levelup'); setTimeout(function () { card.classList.remove('levelup'); }, 320); }
      card.classList.toggle('full', full);
    }
    r.addEventListener('input', upd); upd();
  }

  // ══ PARTAGE ══
  function clip(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'sr-only'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); res(); } catch (e) { rej(e); } document.body.removeChild(ta); });
  }
  var lastSquadCode = null;
  function squadInvite() { return 'Rejoins ma squad KOLTZ pour la Saison 0 ⚡ Code squad\u00a0: ' + lastSquadCode + ' → ' + SITE + '#rejoindre'; }
  function initShare() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-share]'); if (!b) return;
      var k = b.getAttribute('data-share');
      if (k === 'copy') { clip(SITE).then(function () { toast('Lien copié ⚡'); }, function () { toast(SITE); }); }
      else if (k === 'native') { if (navigator.share) navigator.share({ title: 'KOLTZ', text: 'KOLTZ arrive bientôt\u00a0: le forfait mobile qui se joue en squad.', url: SITE }).catch(function () {}); else clip(SITE).then(function () { toast('Lien copié ⚡'); }); }
      else if (k === 'squad' && lastSquadCode) { clip(squadInvite()).then(function () { toast('Invitation copiée ⚡'); }, function () { toast(lastSquadCode); }); }
      else if (k === 'native-squad' && lastSquadCode) { if (navigator.share) navigator.share({ title: 'Ma squad KOLTZ', text: squadInvite() }).catch(function () {}); else clip(squadInvite()).then(function () { toast('Invitation copiée ⚡'); }); }
    });
  }

  // ══ PRÉ-INSCRIPTION ══
  var CODE_RE = /^SQD-[A-HJ-NP-Z2-9]{6}$/;
  var CREA_RE = /^[A-Z0-9-]{3,20}$/;
  function genSquadCode() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '', b = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < 6; i++) out += A[b[i] % A.length];
    return 'SQD-' + out;
  }
  function initJoin() {
    var form = document.getElementById('join-form'); if (!form) return;
    var st = 1, busy = false;
    var next = document.getElementById('j-next'), back = document.getElementById('j-back'), err = document.getElementById('join-err');
    var fPre = document.getElementById('f-pre'), fEm = document.getElementById('f-em'), fCode = document.getElementById('f-squad-code'), fNom = document.getElementById('f-squad-nom'), fCrea = document.getElementById('f-crea');

    function plan() { var r = $('input[name="forfait"]:checked', form); return r ? r.value : 'max'; }
    function squadMode() { var r = $('input[name="squad"]:checked', form); return r ? r.value : 'solo'; }
    function go(n, focus) {
      st = n;
      $$('.scr', form).forEach(function (s) { s.classList.toggle('on', s.id === 's-' + n); });
      $$('.jstep', form).forEach(function (s) { var k = +s.getAttribute('data-s'); s.classList.toggle('on', k === n); s.classList.toggle('done', k < n); if (k === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current'); });
      back.hidden = n !== 2;
      document.getElementById('jnav').hidden = n === 3;
      setT(next, n === 2 ? 'Réserver ma place ⚡' : 'Continuer');
      err.hidden = true;
      if (focus) { var t = n === 1 ? $('input[name="forfait"]:checked', form) : n === 2 ? fPre : document.getElementById('s-3'); if (t) t.focus({ preventScroll: true }); }
    }
    function pick(id) { var r = $('input[name="forfait"][value="' + id + '"]', form); if (r) r.checked = true; }
    function setSquad(mode) { var r = $('input[name="squad"][value="' + mode + '"]', form); if (r) { r.checked = true; syncSquad(); } }
    function syncSquad() {
      var m = squadMode();
      document.getElementById('fld-squad-nom').hidden = m !== 'creer';
      document.getElementById('fld-squad-code').hidden = m !== 'rejoindre';
    }
    function mark(input, ok, errId) {
      input.setAttribute('aria-invalid', String(!ok)); input.classList.toggle('bad', !ok);
      var e = document.getElementById(errId); if (e) e.hidden = ok;
      return ok;
    }
    function validate() {
      fCode.value = fCode.value.toUpperCase().replace(/\s+/g, '');
      fCrea.value = fCrea.value.toUpperCase().replace(/\s+/g, '');
      var checks = [
        [fPre, fPre.value.trim().length > 0, 'f-pre-err'],
        [fEm, /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fEm.value.trim()), 'f-em-err'],
        [fCode, squadMode() !== 'rejoindre' || CODE_RE.test(fCode.value), 'f-squad-code-err'],
        [fCrea, !fCrea.value || CREA_RE.test(fCrea.value), 'f-crea-err']
      ];
      var first = null;
      checks.forEach(function (c) { if (!mark(c[0], c[1], c[2]) && !first) first = c[0]; });
      if (first) first.focus();
      return !first;
    }
    function submit() {
      if (busy) return; busy = true;
      var mode = squadMode();
      var d = {
        email: fEm.value.trim().toLowerCase(), prenom: fPre.value.trim(), forfait: plan(),
        squadMode: mode === 'solo' ? null : mode,
        squadNom: mode === 'creer' ? (fNom.value.trim() || null) : null,
        squadCode: mode === 'creer' ? genSquadCode() : mode === 'rejoindre' ? fCode.value : null,
        codeCreateur: fCrea.value || null
      };
      next.disabled = true; next.innerHTML = '<span class="spin" aria-hidden="true"></span><span class="sr-only">Envoi en cours</span>';
      Promise.all([saveWaitlist(d.email, 'preinscription'), saveAbonne(d)]).then(function (r) {
        var w = r[0], a = r[1];
        busy = false; next.disabled = false;
        if (!w && !a) {
          setT(next, 'Réessayer ⚡');
          err.textContent = "Oups, ta pré-inscription n'a pas pu être enregistrée. Vérifie ta connexion et réessaie, ou écris-nous à contact@koltz.fr.";
          err.hidden = false; return;
        }
        // Confirmation : uniquement ce qui a réellement été enregistré
        setT('d-em', d.email); setT('d-plan', (PLANS[d.forfait] || { name: d.forfait }).name);
        var sq = document.getElementById('d-squad'), sh = document.getElementById('d-share'), note = document.getElementById('d-note');
        sq.hidden = true; sh.hidden = true; note.hidden = true; lastSquadCode = null;
        var extras = d.squadMode || d.codeCreateur;
        if (a === 'dup') {
          note.textContent = "Cet email est déjà pré-inscrit\u00a0: on garde ta première inscription. Pour la modifier, écris-nous à contact@koltz.fr.";
          note.hidden = false; go(3, true); return;
        }
        if (a && d.squadMode === 'creer') {
          lastSquadCode = d.squadCode;
          sq.innerHTML = '';
          var l = document.createElement('p'); l.className = 'label'; l.textContent = 'Ta squad' + (d.squadNom ? ' «\u00a0' + d.squadNom + '\u00a0»' : '') + ' est réservée. Code à partager\u00a0:';
          var c = document.createElement('p'); c.className = 'done__code'; c.textContent = d.squadCode;
          sq.appendChild(l); sq.appendChild(c); sq.hidden = false; sh.hidden = false;
        } else if (a && d.squadMode === 'rejoindre') {
          sq.innerHTML = ''; var j = document.createElement('p'); j.textContent = 'Demande pour rejoindre la squad ' + d.squadCode + ' enregistrée. On fait le lien au lancement.'; sq.appendChild(j); sq.hidden = false;
        }
        if (a && d.codeCreateur) { note.textContent = 'Code créateur ' + d.codeCreateur + ' noté. Il sera vérifié au lancement.'; note.hidden = false; }
        if (!a && extras) { note.textContent = "Tu es bien sur la liste, mais tes infos de squad / code créateur n'ont pas pu être enregistrées. Tu pourras les ajouter au lancement."; note.hidden = false; }
        go(3, true);
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (st === 1) go(2, true);
      else if (st === 2 && validate()) submit();
    });
    back.addEventListener('click', function () { go(1, true); });
    $$('input[name="squad"]', form).forEach(function (r) { r.addEventListener('change', syncSquad); });
    [fCode, fCrea].forEach(function (i) { i.addEventListener('blur', function () { i.value = i.value.toUpperCase().replace(/\s+/g, ''); }); });
    [fPre, fEm, fCode, fCrea].forEach(function (i) { i.addEventListener('input', function () { if (i.classList.contains('bad')) { i.classList.remove('bad'); i.setAttribute('aria-invalid', 'false'); } }); });
    // Liens « Réserver ce forfait » / « Créer ma squad » : présélection
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href="#rejoindre"]'); if (!a) return;
      var p = a.getAttribute('data-pick'), s = a.getAttribute('data-squad');
      if (p) pick(p); if (s) setSquad(s);
      if (st === 3) go(1);
    });
    syncSquad(); go(1);
    // API de test
    window.KOLTZ = { go: go, state: function () { return st; } };
  }

  // ══ MODAL LÉGALE (contenu inchangé) ══
  const LEGAL={
 mentions:{t:'Mentions légales',b:'<h4>Éditeur</h4><p>KOLTZ MOBILE SAS — Société par actions simplifiée<br/>RCS Paris 988 421 770<br/>Siège social : Paris, France<br/>Directeur de la publication : Ryadh N.</p><h4>Hébergement</h4><p>Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, USA</p><h4>Contact</h4><p>contact@koltz.fr</p>'},
 cgv:{t:'Conditions générales de vente',b:'<h4>Objet</h4><p>Les présentes CGV régissent la souscription aux forfaits mobiles Koltz, sans engagement de durée.</p><h4>Tarifs</h4><p>Prix TTC, garantis 12 mois. Toute évolution tarifaire est notifiée 30 jours à l\'avance avec faculté de résiliation sans frais.</p><h4>Résiliation</h4><p>Résiliation à tout moment depuis l\'espace client, effective en fin de période payée. Aucun frais de résiliation.</p><h4>Droit de rétractation</h4><p>14 jours à compter de la souscription, conformément au Code de la consommation.</p>'},
 privacy:{t:'Politique de confidentialité',b:'<h4>Données collectées</h4><p>Identité, coordonnées, données de facturation et de consommation, strictement nécessaires à la fourniture du service.</p><h4>Utilisation</h4><p>Gestion du compte, facturation, support, obligations légales (conservation des données de connexion).</p><h4>Vos droits</h4><p>Accès, rectification, suppression, portabilité — via privacy@koltz.fr. Réclamation possible auprès de la CNIL.</p><h4>Conservation</h4><p>Données supprimées ou anonymisées à la clôture du compte, hors obligations légales.</p>'},
 cookies:{t:'Cookies',b:'<h4>Cookies utilisés</h4><p>Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement (session, préférences). Aucun cookie publicitaire ni traceur tiers.</p><h4>Gestion</h4><p>Vous pouvez configurer votre navigateur pour bloquer les cookies ; certaines fonctionnalités peuvent être affectées.</p>'}
};
  function initLegal() {
    var dlg = document.getElementById('lmodal'); if (!dlg) return;
    var prev = null;
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-legal]'); if (!b) return;
      var d = LEGAL[b.getAttribute('data-legal')]; if (!d) return;
      prev = b; setT('lm-title', d.t); document.getElementById('lm-body').innerHTML = d.b;
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      document.getElementById('lm-close').focus();
    });
    document.getElementById('lm-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (prev) prev.focus(); prev = null; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    hydratePlans(); initNav(); initSquadCalc(); initShare(); initJoin(); initLegal(); loadWaitlistCount();
  });
})();
