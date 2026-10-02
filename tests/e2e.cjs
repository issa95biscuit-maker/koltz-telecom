// Suite headless KOLTZ (landing SQUAD). Prérequis : `npm i puppeteer-core` + Chrome.
// Usage : node tests/serve.cjs & ; CHROME=/usr/bin/google-chrome node tests/e2e.cjs
// Supabase est simulé par interception réseau (aucune donnée réelle écrite) ; un scénario « real » tente le vrai projet.
const p = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://localhost:8099/';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let pass = 0, fail = 0; const fails = [];
const R = (ok, msg) => { ok ? pass++ : (fail++, fails.push(msg)); console.log((ok ? '  PASS ' : '  FAIL ') + msg); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DESK = { width: 1440, height: 900 }, MOB = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

// mode : ok | fail (réseau KO) | partial (waitlist OK, abonnes 401) | real (pas de mock) ; count : valeur du compteur simulé
async function newPage(b, vp, opt) {
  opt = Object.assign({ mode: 'ok', count: 0, plans: null }, opt);
  const pg = await b.newPage(); await pg.setViewport(vp || DESK);
  const log = [], posts = [];
  pg.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push(m.type().toUpperCase() + ' ' + m.text()); });
  await pg.evaluateOnNewDocument(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  await pg.setRequestInterception(true);
  pg.on('request', r => {
    const u = r.url();
    if (opt.plans && /\/assets\/js\/plans\.js$/.test(u)) return r.respond({ status: 200, contentType: 'text/javascript', body: opt.plans });
    if (/supabase\.co/.test(u)) {
      if (opt.mode === 'real') return r.continue();
      if (opt.mode === 'fail') return r.abort('namenotresolved');
      const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'content-range', 'content-range': '*/' + opt.count, 'Content-Type': 'application/json' };
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: h, body: '' });
      if (r.method() === 'HEAD' || r.method() === 'GET') return r.respond({ status: 200, headers: h, body: '[]' });
      const table = u.split('/rest/v1/')[1].split('?')[0];
      posts.push({ table, url: u, prefer: r.headers()['prefer'] || '', body: JSON.parse(r.postData() || 'null') });
      if (opt.mode === 'partial' && table === 'abonnes') return r.respond({ status: 401, headers: h, body: JSON.stringify({ message: 'new row violates row-level security policy' }) });
      return r.respond({ status: 201, headers: h, body: '' });
    }
    r.continue();
  });
  pg._log = log; pg._posts = posts; return pg;
}
const load = async (pg, url) => { const res = await pg.goto(url || BASE, { waitUntil: 'networkidle0' }); await pg.evaluate(() => document.fonts.ready); return res; };
const vis = (pg, sel) => pg.$eval(sel, e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !e.closest('[hidden]'); }).catch(() => false);
const txt = (pg, sel) => pg.$eval(sel, e => e.textContent.trim()).catch(() => null);
const step = pg => pg.evaluate(() => window.KOLTZ && window.KOLTZ.state());

async function fillJoin(pg, o) {
  // o : {plan, prenom, email, mode, nom, code, crea}
  await pg.evaluate(() => document.getElementById('rejoindre').scrollIntoView());
  if (o.plan) await pg.click(`input[name="forfait"][value="${o.plan}"]`);
  await pg.click('#j-next'); await sleep(80);
  await pg.$$eval('#f-pre,#f-em,#f-squad-nom,#f-squad-code,#f-crea', es => es.forEach(e => { e.value = ''; }));
  if (o.prenom) await pg.type('#f-pre', o.prenom);
  if (o.email) await pg.type('#f-em', o.email);
  if (o.mode) await pg.click(`input[name="squad"][value="${o.mode}"]`);
  if (o.nom) await pg.type('#f-squad-nom', o.nom);
  if (o.code) await pg.type('#f-squad-code', o.code);
  if (o.crea) await pg.type('#f-crea', o.crea);
  await pg.click('#j-next'); await sleep(400);
}

(async () => {
  const b = await p.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const PLAN_IDS = ['mini', 'max', 'ultra', 'infinity'];

  console.log('\n# 1. Chargement, sécurité, perf (desktop 1440)');
  let pg = await newPage(b, DESK, { count: 0 });
  const bytes = { total: 0, byType: {} };
  pg.on('response', async r => { try { const l = +(r.headers()['content-length'] || 0) || (await r.buffer()).length; const t = r.request().resourceType(); bytes.total += l; bytes.byType[t] = (bytes.byType[t] || 0) + l; } catch (e) {} });
  const res = await load(pg);
  const H = res.headers();
  R(res.status() === 200, 'index.html → 200');
  R(pg._log.length === 0, 'aucune erreur/avertissement console' + (pg._log.length ? ' : ' + pg._log.join(' | ') : ''));
  R((await pg.evaluate(() => window.__csp)).length === 0, 'aucune violation CSP');
  R(/script-src 'self' https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.117\.2\/;/.test(H['content-security-policy'] || '') && !/unsafe-inline/.test(H['content-security-policy']), "CSP stricte sans 'unsafe-inline'");
  for (const k of ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy']) R(!!H[k], 'en-tête ' + k);
  console.log('  note : HSTS est ajouté automatiquement par Vercel sur ses domaines (non testable en local)');
  R(await pg.evaluate(() => !!(window.supabase && window.supabase.createClient)), 'supabase-js chargé (SRI valide)');
  const fonts = await pg.evaluate(() => ['900 40px Unbounded', '400 16px Inter', '500 12px "JetBrains Mono"'].map(f => document.fonts.check(f)));
  R(fonts.every(Boolean), 'polices auto-hébergées chargées (Unbounded, Inter, JetBrains Mono) ' + fonts);
  R(await pg.evaluate(() => [...document.styleSheets].every(s => !s.href || s.href.startsWith(location.origin))), 'aucune feuille de style tierce (plus de Google Fonts)');
  const dom = await pg.evaluate(() => ({ inlineStyle: document.querySelectorAll('[style]').length, inlineHandlers: [...document.querySelectorAll('*')].filter(e => [...e.attributes].some(a => /^on/.test(a.name))).length, inlineScripts: [...document.scripts].filter(s => !s.src && s.type !== 'application/ld+json').length, styleTags: document.querySelectorAll('style').length }));
  R(dom.inlineStyle === 0 && dom.inlineHandlers === 0 && dom.inlineScripts === 0 && dom.styleTags === 0, 'zéro style/script/handler inline ' + JSON.stringify(dom));
  R(!(await vis(pg, '#waitlist-proof')), 'compteur masqué quand count = 0 (pas de faux chiffre)');
  await pg.close();
  console.log('  poids transféré (non compressé) :', Math.round(bytes.total / 1024) + ' Ko', JSON.stringify(Object.fromEntries(Object.entries(bytes.byType).map(([k, v]) => [k, Math.round(v / 1024) + ' Ko']))));

  pg = await newPage(b, DESK, { count: 1234 }); await load(pg); await sleep(300);
  R(await vis(pg, '#waitlist-proof') && /1\s?234/.test(await txt(pg, '#waitlist-count')), 'compteur affiché seulement avec un vrai count (1 234 simulé)');
  await pg.close();

  console.log('\n# 2. Structure, SEO, a11y');
  pg = await newPage(b, DESK); await load(pg);
  const s = await pg.evaluate(() => {
    const ids = [...document.querySelectorAll('main > section')].map(x => x.id || '(hero)');
    const h1 = document.querySelectorAll('h1').length;
    const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]); let skip = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skip++;
    const badAnchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1)));
    const unlabeled = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(i => !(i.labels && i.labels.length) && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby')).map(i => i.id || i.name);
    const noname = [...document.querySelectorAll('a,button')].filter(e => !(e.textContent.trim() || e.getAttribute('aria-label'))).length;
    const imgs = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
    const meta = n => (document.querySelector(`meta[property="${n}"],meta[name="${n}"]`) || {}).content;
    return { ids, h1, skip, badAnchors, unlabeled, noname, imgs, lang: document.documentElement.lang, title: document.title, desc: meta('description'), og: meta('og:image'), tw: meta('twitter:card'), canon: (document.querySelector('link[rel=canonical]') || {}).href, skipLink: document.querySelector('a.skip, a[href="#main"]') && document.querySelector('a[href="#main"]').textContent.trim(), main: !!document.querySelector('main#main') };
  });
  console.log('  sections :', s.ids.join(' · '));
  R(s.ids.length + 2 >= 14, `structure 14 blocs (header + ${s.ids.length} sections + footer)`);
  for (const id of ['constat', 'comment', 'prix-squad', 'forfaits', 'xp', 'createurs', 'support', 'regles', 'gaming', 'parrainage', 'faq', 'rejoindre']) R(s.ids.includes(id), 'section #' + id);
  R(s.h1 === 1 && s.skip === 0, `1 seul h1 (${s.h1}), aucun saut de niveau de titre (${s.skip})`);
  R(s.badAnchors.length === 0, 'toutes les ancres #… pointent vers un id existant ' + s.badAnchors.join(','));
  R(s.unlabeled.length === 0, 'tous les champs ont un label ' + s.unlabeled.join(','));
  R(s.noname === 0 && s.imgs === 0, 'liens/boutons nommés, images avec alt');
  R(s.lang === 'fr' && !!s.title && !!s.desc && /og-image\.png$/.test(s.og || '') && s.tw === 'summary_large_image' && s.canon === 'https://www.koltz.fr/', 'lang, title, description, OG/Twitter, canonical');
  R(s.main && !!s.skipLink, 'lien d’évitement vers <main id="main">');
  R(/Joue collectif\./.test(await txt(pg, 'h1')), 'h1 = « Joue collectif. »');
  // clavier : 1er Tab = lien d'évitement, puis focus visible
  await pg.keyboard.press('Tab');
  R(await pg.evaluate(() => document.activeElement.getAttribute('href') === '#main'), '1er Tab → lien d’évitement');
  const ring = await pg.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; });
  R(ring, 'focus visible (outline) au clavier');
  let tabOK = true; for (let i = 0; i < 12; i++) { await pg.keyboard.press('Tab'); const ok = await pg.evaluate(() => { const e = document.activeElement, r = e.getBoundingClientRect(); return e !== document.body && r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; }); if (!ok) tabOK = false; }
  R(tabOK, '12 Tab suivants : éléments visibles, aucun focus perdu');
  // FAQ
  const faqN = await pg.$$eval('#faq details', d => d.length);
  await pg.click('#faq details summary'); const op = await pg.$eval('#faq details', d => d.open);
  R(faqN >= 8 && op, `FAQ en <details> (${faqN} questions), ouverture au clic`);
  // Ordre de lecture des contrastes clés (Bone / Void)
  const contrast = await pg.evaluate(() => { const L = c => { const [r, g, b] = c.match(/\d+/g).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }; const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }; const bg = 'rgb(7, 7, 10)'; return ['.body', '.label', 'h2'].map(s => { const e = document.querySelector(s); return [s, cr(getComputedStyle(e).color, bg).toFixed(1)]; }); });
  R(contrast.every(([, c]) => +c >= 4.5), 'contrastes texte ≥ 4.5:1 sur Void ' + JSON.stringify(contrast));
  await pg.close();

  console.log('\n# 3. Promesses interdites (texte rendu + sources)');
  pg = await newPage(b, DESK); await load(pg);
  const all = await pg.evaluate(() => document.documentElement.textContent + ' ' + [...document.querySelectorAll('meta')].map(m => m.content).join(' '));
  const src = ['index.html', '404.html', 'assets/js/koltz.js', 'assets/js/plans.js'].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  const legalStart = src.indexOf('const LEGAL='), legalEnd = src.indexOf('};', legalStart);
  const srcNoLegal = src.slice(0, legalStart) + src.slice(legalEnd);
  const BAN = [/QoS/i, /prioritair/i, /Nitro/i, /Netflix/i, /Spotify/i, /garanti[e]?s? à vie/i, /à vie/i, /Orange/, /SFR|Bouygues|Free\b/, /5G partout/i, /90\s?s(ec)?\b/i, /\b847\b/, /4,8\s?\/\s?5|★/, /−\s?\d+\s?€|-\s?\d+\s?€ vs/i, /illimité[e]?s? data|data illimitée/i, /Made in France/i, /8\s?s\b/, /1\s?000\s?€|15\s?€/];
  for (const re of BAN) { const a = re.test(all), b2 = re.test(srcNoLegal); R(!a && !b2, 'absent : ' + re + (a ? ' [texte rendu]' : '') + (b2 ? ' [source]' : '')); }
  R(/à annoncer au lancement/i.test(all), 'remise squad « à annoncer au lancement »');
  R(['6,99', '11,99', '14,99', '19,99'].every(x => all.includes(x + ' €')), 'prix inchangés 6,99 / 11,99 / 14,99 / 19,99 €');
  await pg.close();

  console.log('\n# 4. Nav mobile (390)');
  pg = await newPage(b, MOB); await load(pg);
  R(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'aucun débordement horizontal à 390 px');
  R(!(await vis(pg, '#nav-links a')), 'menu fermé : liens invisibles (non focusables)');
  await pg.click('#burger'); await sleep(450);
  R(await pg.$eval('#burger', e => e.getAttribute('aria-expanded')) === 'true' && await vis(pg, '#nav-links a'), 'burger → menu ouvert, aria-expanded=true');
  await pg.keyboard.press('Escape'); await sleep(450);
  R(await pg.$eval('#burger', e => e.getAttribute('aria-expanded')) === 'false' && await pg.evaluate(() => document.activeElement.id === 'burger') && !(await vis(pg, '#nav-links a')), 'Échap → fermé, focus rendu au burger');
  await pg.click('#burger'); await sleep(450);
  await pg.click('#nav-links a[href="#forfaits"]'); await sleep(900);
  R(await pg.$eval('#burger', e => e.getAttribute('aria-expanded')) === 'false', 'clic sur un lien → menu fermé');
  const top = await pg.$eval('#forfaits', e => Math.round(e.getBoundingClientRect().top));
  R(top >= 0 && top < 160, `#forfaits visible sous le header sticky (top=${top}px)`);
  await pg.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true }); await sleep(200);
  R(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'aucun débordement horizontal à 320 px');
  await pg.close();

  console.log('\n# 5. Curseur prix squad');
  pg = await newPage(b, DESK); await load(pg);
  for (let n = 1; n <= 5; n++) {
    await pg.$eval('#squad-size', (e, n) => { e.value = n; e.dispatchEvent(new Event('input', { bubbles: true })); }, n);
    const st = await pg.evaluate(() => ({ out: document.getElementById('squad-out').textContent, on: document.querySelectorAll('#squad-bar i.on').length, msg: document.getElementById('squad-msg').textContent, full: document.getElementById('squadcalc').classList.contains('full'), vt: document.getElementById('squad-size').getAttribute('aria-valuetext') }));
    R(st.out === String(n) && st.on === n && st.full === (n === 5) && st.vt.startsWith(n + ' membre') && !/\d+,\d+\s?€/.test(st.msg) && (n === 1 || /annonc/.test(st.msg)), `squad ${n}/5 : « ${st.msg} »`);
  }
  await pg.focus('#squad-size'); await pg.keyboard.press('ArrowLeft');
  R(await txt(pg, '#squad-out') === '4', 'curseur pilotable au clavier');
  await pg.close();

  console.log('\n# 6. Présélection data-pick / data-squad');
  pg = await newPage(b, DESK); await load(pg);
  for (const id of PLAN_IDS) {
    await pg.click(`a[data-pick="${id}"]`); await sleep(100);
    R(await pg.$eval(`input[name="forfait"][value="${id}"]`, e => e.checked), `« Réserver » ${id} → forfait présélectionné`);
  }
  await pg.click('.hero a[data-squad="creer"]'); await sleep(100);
  R(await pg.$eval('input[name="squad"][value="creer"]', e => e.checked) && await vis(pg, '#fld-squad-nom') === false, 'CTA « Créer ma squad » → mode squad « créer » présélectionné (champ affiché à l’étape 2)');
  await pg.close();

  console.log('\n# 7. Tunnel : forfaits × modes squad (Supabase simulé OK)');
  const MODES = ['solo', 'creer', 'rejoindre'];
  let k = 0;
  for (const plan of PLAN_IDS) for (const mode of MODES) {
    k++;
    pg = await newPage(b, k % 2 ? DESK : MOB); await load(pg);
    const crea = k % 3 === 0 ? 'zerator-24' : '';
    const o = { plan, prenom: 'Test' + k, email: `t${k}@exemple.fr`, mode, nom: mode === 'creer' ? 'Les Clutchers' : '', code: mode === 'rejoindre' ? 'sqd-ab2cd3' : '', crea };
    await fillJoin(pg, o);
    const w = pg._posts.find(x => x.table === 'waitlist'), a = pg._posts.find(x => x.table === 'abonnes');
    const ab = a && a.body && a.body[0];
    const okW = w && w.body[0].email === o.email && w.body[0].source === 'preinscription' && /on_conflict=email/.test(w.url) && /ignore-duplicates/.test(w.prefer);
    const expMode = mode === 'solo' ? null : mode;
    const okA = ab && ab.email === o.email && ab.prenom === o.prenom && ab.forfait === plan && ab.statut === 'pending' && ab.nom === null && ab.points === 0 && ab.squad_mode === expMode
      && (mode === 'creer' ? /^SQD-[A-HJ-NP-Z2-9]{6}$/.test(ab.squad_code) && ab.squad_nom === 'Les Clutchers' : mode === 'rejoindre' ? ab.squad_code === 'SQD-AB2CD3' && ab.squad_nom === null : ab.squad_code === null && ab.squad_nom === null)
      && ab.code_createur === (crea ? crea.toUpperCase() : null) && !/^Prefer.*return=representation/.test(a.prefer);
    const s3 = await step(pg);
    const conf = await pg.evaluate(() => ({ em: document.getElementById('d-em').textContent, plan: document.getElementById('d-plan').textContent, sq: document.getElementById('d-squad').hidden ? '' : document.getElementById('d-squad').textContent, share: !document.getElementById('d-share').hidden, note: document.getElementById('d-note').hidden ? '' : document.getElementById('d-note').textContent, focus: document.activeElement.id }));
    const okC = s3 === 3 && conf.em === o.email && conf.plan.length > 0 && conf.focus === 's-3'
      && (mode === 'creer' ? conf.sq.includes(ab && ab.squad_code) && conf.share : mode === 'rejoindre' ? conf.sq.includes('SQD-AB2CD3') && !conf.share : !conf.sq && !conf.share)
      && (crea ? conf.note.includes(crea.toUpperCase()) : !conf.note);
    R(okW && okA && okC && pg._log.length === 0, `${plan} × ${mode}${crea ? ' + code créateur' : ''} : waitlist ${okW ? 'OK' : 'KO'}, abonnes ${okA ? 'OK' : 'KO ' + JSON.stringify(ab)}, confirmation ${okC ? 'OK' : 'KO ' + JSON.stringify(conf)}`);
    if (k === 2) {
      console.log('  exemple payload abonnes :', JSON.stringify(ab));
      // partage de l'invitation squad
      await pg.click('#d-share [data-share="squad"]').catch(() => {}); await sleep(200);
      R(/copiée|SQD-/.test(await txt(pg, '#toast') || ''), 'bouton « copier l’invitation » de la squad → toast');
    }
    await pg.close();
  }

  console.log('\n# 8. Validations');
  pg = await newPage(b, DESK); await load(pg);
  await fillJoin(pg, { plan: 'max' });
  R(await step(pg) === 2 && pg._posts.length === 0, 'champs vides → reste à l’étape 2, aucun envoi');
  R(await pg.$eval('#f-pre', e => e.getAttribute('aria-invalid')) === 'true' && await vis(pg, '#f-pre-err') && await vis(pg, '#f-em-err'), 'erreurs prénom + email affichées, aria-invalid');
  R(await pg.evaluate(() => document.activeElement.id) === 'f-pre', 'focus sur le 1er champ en erreur');
  await pg.click('#j-back'); await sleep(50);
  await fillJoin(pg, { prenom: 'Ry', email: 'pas-un-email' });
  R(await step(pg) === 2 && await vis(pg, '#f-em-err') && !(await vis(pg, '#f-pre-err')), 'email invalide refusé');
  await pg.click('#j-back'); await sleep(50);
  await fillJoin(pg, { prenom: 'Ry', email: 'ry@exemple.fr', mode: 'rejoindre', code: 'ABC' });
  R(await step(pg) === 2 && await vis(pg, '#f-squad-code-err') && pg._posts.length === 0, 'code squad invalide refusé (format SQD-XXXXXX)');
  await pg.click('#j-back'); await sleep(50);
  await fillJoin(pg, { prenom: 'Ry', email: 'ry@exemple.fr', mode: 'solo', crea: 'bad$code' });
  R(await step(pg) === 2 && await vis(pg, '#f-crea-err') && pg._posts.length === 0, 'code créateur invalide refusé');
  await pg.click('#j-back'); await sleep(50);
  await fillJoin(pg, { prenom: '<img src=x onerror=alert(1)>', email: 'xss@exemple.fr', mode: 'creer', nom: '<b>pwn</b>' });
  R(await step(pg) === 3 && await pg.evaluate(() => !document.querySelector('#d-squad b, #d-squad img')) && (await txt(pg, '#d-squad')).includes('<b>pwn</b>'), 'nom de squad affiché en texte (pas d’injection HTML)');
  // retour à l'étape 1 depuis la confirmation via un CTA
  await pg.click('a[data-pick="ultra"]'); await sleep(100);
  R(await step(pg) === 1 && await pg.$eval('input[value="ultra"]', e => e.checked), 'CTA après confirmation → tunnel réinitialisé, Ultra présélectionné');
  await pg.close();

  console.log('\n# 9. Échecs Supabase (messages honnêtes)');
  pg = await newPage(b, DESK, { mode: 'fail' }); await load(pg);
  await fillJoin(pg, { plan: 'mini', prenom: 'Ry', email: 'ry@exemple.fr', mode: 'creer' });
  R(await step(pg) === 2 && await vis(pg, '#join-err') && /n'a pas pu être enregistrée/.test(await txt(pg, '#join-err')) && /Réessayer/.test(await txt(pg, '#j-next')), 'réseau KO → reste étape 2, erreur visible, bouton « Réessayer »');
  R(await pg.$eval('#join-err', e => e.getAttribute('role')) === 'alert', 'erreur annoncée (role=alert)');
  await pg.close();
  pg = await newPage(b, DESK, { mode: 'partial' }); await load(pg);
  await fillJoin(pg, { plan: 'max', prenom: 'Ry', email: 'ry@exemple.fr', mode: 'creer', crea: 'KOLTZ' });
  const pc = await pg.evaluate(() => ({ sq: document.getElementById('d-squad').hidden, note: document.getElementById('d-note').textContent }));
  R(await step(pg) === 3 && pc.sq && /n'ont pas pu être enregistrées/.test(pc.note), 'waitlist OK mais abonnes refusé (RLS) → confirmé, aucun code squad affiché, note explicative');
  await pg.close();
  pg = await newPage(b, DESK, { mode: 'real' }); await load(pg);
  await fillJoin(pg, { plan: 'max', prenom: 'Ry', email: 'test-e2e@exemple.fr' });
  await sleep(2500);
  R(await step(pg) === 2 && await vis(pg, '#join-err'), 'vrai projet Supabase (actuellement injoignable) → erreur honnête, pas de fausse confirmation');
  await pg.close();

  console.log('\n# 10. Renommage des forfaits (plans.js = source unique)');
  const renamed = fs.readFileSync(path.join(__dirname, '..', 'assets/js/plans.js'), 'utf8').replace(/name:\s*'Mini'/, "name: 'SPAWN'").replace(/name:\s*'Max'/, "name: 'RUSH'").replace(/name:\s*'Ultra'/, "name: 'CLUTCH'").replace(/name:\s*'Infinity'/, "name: 'LÉGENDE'");
  pg = await newPage(b, DESK, { plans: renamed }); await load(pg);
  const nm = await pg.evaluate(() => document.body.innerText);
  R(['SPAWN', 'RUSH', 'CLUTCH', 'LÉGENDE'].every(n => nm.includes(n)) && !/\b(Mini|Max|Ultra|Infinity)\b/.test(nm), 'plans.js modifié → tous les noms remplacés dans la page (cartes, tableau, tunnel)');
  await fillJoin(pg, { plan: 'ultra', prenom: 'Ry', email: 'ry@exemple.fr' });
  R(await txt(pg, '#d-plan') === 'CLUTCH' && pg._posts.find(x => x.table === 'abonnes').body[0].forfait === 'ultra', 'confirmation affiche le nouveau nom, la base reçoit toujours l’id stable « ultra »');
  await pg.close();

  console.log('\n# 11. Mentions légales, partage, 404');
  pg = await newPage(b, DESK); await load(pg);
  for (const kd of ['mentions', 'cgv', 'privacy', 'cookies']) {
    await pg.click(`footer [data-legal="${kd}"]`); await sleep(100);
    const d = await pg.evaluate(() => ({ open: document.getElementById('lmodal').open, focus: document.activeElement.id, len: document.getElementById('lm-body').textContent.length }));
    await pg.keyboard.press('Escape'); await sleep(100);
    const back = await pg.evaluate(k => document.activeElement.getAttribute('data-legal') === k, kd);
    R(d.open && d.focus === 'lm-close' && d.len > 50 && back, `modale ${kd} : ouverte, focus sur Fermer, Échap → focus rendu au déclencheur`);
  }
  await pg.click('[data-share="copy"]'); await sleep(200);
  R(/Lien copié|koltz\.fr/.test(await txt(pg, '#toast')), 'partage « Copier le lien » → toast');
  const wa = await pg.$eval('[data-share="wa"], a[href*="wa.me"]', e => e.getAttribute('href') || '').catch(() => '');
  R(!(await pg.evaluate(() => { const a = document.querySelector('a[href*="wa.me"],a[href^="sms:"]'); return a && !/koltz\.fr/.test(decodeURIComponent(a.href)); })), 'liens WhatsApp/SMS contiennent l’URL du site');
  R(!wa || /^https:\/\/wa\.me\//.test(wa), 'lien WhatsApp valide');
  await pg.close();
  pg = await newPage(b, DESK);
  pg = await newPage(b, DESK); await load(pg);
  await pg.click('#s-2 [data-legal="privacy"]').catch(() => {});
  await fillJoin(pg, { plan: 'max' }); await pg.click('#s-2 [data-legal="privacy"]'); await sleep(100);
  R(await pg.evaluate(() => document.getElementById('lmodal').open && /Politique de confidentialité/.test(document.getElementById('lm-title').textContent)), 'lien « Confidentialité » sous le formulaire → modale');
  await pg.close();
  pg = await newPage(b, DESK);
  const r404 = await load(pg, BASE + 'nimporte-quoi');
  R(r404.status() === 404 && /Respawn/.test(await txt(pg, 'h1')) && pg._log.filter(l => !/404/.test(l)).length === 0 && (await pg.evaluate(() => window.__csp)).length === 0, '404 : statut 404, page de marque, sans erreur ni violation CSP');
  await pg.close();
  for (const f of ['robots.txt', 'sitemap.xml', 'og-image.png', 'assets/img/favicon.svg', 'assets/img/koltz-wordmark.svg', 'assets/img/apple-touch-icon.png']) {
    pg = await b.newPage(); const rr = await pg.goto(BASE + f); R(rr.status() === 200, '/' + f + ' → 200'); await pg.close();
  }
  await b.close();
  console.log(`\nRÉSULTAT : ${pass} PASS, ${fail} FAIL`);
  if (fail) { console.log('Échecs :\n- ' + fails.join('\n- ')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(2); });
