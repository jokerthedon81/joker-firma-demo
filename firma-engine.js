/* JOKERAl Firma — silnik zamówień palet (reguły, bez LLM). Działa w przeglądarce i w Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JokerFirma = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const RES_MIN = 30;            // ważność rezerwacji (minuty)
  const BIG = 100;               // powyżej tej liczby -> akceptacja człowieka
  const OPEN = 6 * 60, CLOSE = 22 * 60; // rampa samoobsługowa 6:00–22:00
  const SALT = 'JOKERAl-firma-demo';
  const KEY = 'jokerFirma.v1';

  /* ---------- daty ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  const DOW = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const DOW_ACC = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  const MON_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const window_ = (t, plus) => { const [h, m] = t.split(':').map(Number); const e = h * 60 + m + (plus || 60); return t + '–' + pad(Math.floor(e / 60) % 24) + ':' + pad(e % 60); };
  const hm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  function dayLabel(isoD, now) {
    const d = fromIso(isoD), t = iso(now), diff = Math.round((d - fromIso(t)) / 864e5);
    const base = d.getDate() + ' ' + MON_GEN[d.getMonth()];
    if (diff === 0) return 'dziś (' + base + ')';
    if (diff === 1) return 'jutro (' + DOW[d.getDay()] + ', ' + base + ')';
    if (diff === 2) return 'pojutrze (' + DOW[d.getDay()] + ', ' + base + ')';
    return DOW_ACC[d.getDay()] + ', ' + base;
  }
  const short = isoD => { const d = fromIso(isoD); return DOW[d.getDay()].slice(0, 3) + '. ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1); };

  /* ---------- pieniądze ---------- */
  const zl = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł';

  /* ---------- normalizacja + liczby słownie ---------- */
  const DIA = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[ąćęłńóśźż]/g, c => DIA[c])
      .replace(/(\d)\s*:\s*(\d\d)(?!\d)/g, '$1:$2')
      .replace(/\b(o|godz\w*)\s+(\d{1,2})[.,](\d\d)(?!\d)/g, '$1 $2:$3')
      .replace(/\b(\d{1,2})[.,]([2-5]\d)(?![\d.\/])/g, '$1:$2')
      .replace(/\b(\d{1,2})[.,]1[3-9](?![\d.\/])/g, m => m.replace(/[.,]/, ':'))
      .replace(/(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?/g, '$1/$2')
      .replace(/(\d+)\s*-?\s*(go|ego|ej)\b/g, '$1')
      .replace(/pol\s+palet/g, 'polpalet').replace(/euro\s+palet/g, 'europalet')
      .replace(/[^a-z0-9:\/\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const NUMW = {
    zero: 0, jeden: 1, jedna: 1, jedno: 1, jednej: 1, dwa: 2, dwie: 2, dwoch: 2, trzy: 3, trzech: 3, cztery: 4, czterech: 4,
    piec: 5, pieciu: 5, szesc: 6, szesciu: 6, siedem: 7, siedmiu: 7, osiem: 8, osmiu: 8, dziewiec: 9, dziewieciu: 9,
    dziesiec: 10, dziesieciu: 10, jedenascie: 11, dwanascie: 12, trzynascie: 13, czternascie: 14, pietnascie: 15, szesnascie: 16,
    siedemnascie: 17, osiemnascie: 18, dziewietnascie: 19, dwadziescia: 20, dwudziestu: 20, trzydziesci: 30, trzydziestu: 30,
    czterdziesci: 40, czterdziestu: 40, piecdziesiat: 50, piecdziesieciu: 50, szescdziesiat: 60, siedemdziesiat: 70, osiemdziesiat: 80,
    dziewiecdziesiat: 90, sto: 100, stu: 100, dwiescie: 200, trzysta: 300, czterysta: 400, piecset: 500, szescset: 600,
    siedemset: 700, osiemset: 800, dziewiecset: 900, tysiac: 1000, kilkanascie: 15, kilka: 5, kilkadziesiat: 50
  };
  const mag = n => n >= 1000 ? 4 : n >= 100 ? 3 : n >= 20 ? 2 : n >= 10 ? 1.5 : 1;
  function wordsToNums(t) {
    const w = t.split(' '), out = [];
    let acc = null, last = 9;
    const flush = () => { if (acc !== null) out.push(String(acc)); acc = null; last = 9; };
    for (const x of w) {
      if (x in NUMW) {
        const v = NUMW[x], m = mag(v);
        if (acc !== null && m < last && !(last === 1.5) && !(m === 1.5 && last < 3)) { acc += v; last = m; }
        else { flush(); acc = v; last = m; }
      } else { flush(); out.push(x); }
    }
    flush();
    return out.join(' ');
  }
  const prep = s => wordsToNums(norm(s));

  /* ---------- produkty ---------- */
  const PRODUCTS = [
    { id: 'epal', name: 'Paleta euro EPAL', short: 'palety euro EPAL', size: '1200×800 mm', price: 45, stock: 120, re: /\b(euro\w*|epal\w*|europalet\w*)/ },
    { id: 'przem', name: 'Paleta przemysłowa', short: 'palety przemysłowe', size: '1200×1000 mm', price: 55, stock: 60, re: /\b(przemysl\w*|1200 ?(x|na) ?1000|duz\w* palet)/ },
    { id: 'jedn', name: 'Paleta jednorazowa', short: 'palety jednorazowe', size: '1200×800 mm, lekka', price: 18, stock: 300, re: /\b(jednoraz\w*|eksport\w*|tani\w*)/ },
    { id: 'pol', name: 'Półpaleta', short: 'półpalety', size: '800×600 mm', price: 32, stock: 25, re: /\b(polpalet\w*|pol palet\w*|polowk\w*|800 ?(x|na) ?600|mal\w* palet)/ }
  ];
  function findProduct(t) { for (const p of PRODUCTS) if (p.re.test(t)) return p.id; return null; }

  /* ---------- parsowanie terminu ---------- */
  const ORD = { pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5, szost: 6, siodm: 7, osm: 8, dziewiat: 9, dziesiat: 10, jedenast: 11, dwunast: 12, trzynast: 13, czternast: 14, pietnast: 15, szesnast: 16, siedemnast: 17, osiemnast: 18, dziewietnast: 19, dwudziest: 20 };
  const ORD_RE = '(' + Object.keys(ORD).sort((a, b) => b.length - a.length).join('|') + ')(?:a|ej|ia|iej)';
  const NOTQ = '(?!\\s*(?:\\w*palet|szt|sztuk|razy|zl|zlotych|osob|stycz|lut|marc|kwiet|maj|czerw|lip|sierp|wrze|pazdz|listop|grud))';
  function parseTime(t) {
    let m, h = null, min = 0, s = null;
    const adj = (h0) => {
      let hh = h0;
      if (/(po poludniu|popoludniu|wieczor)/.test(t) && hh < 12) hh += 12;
      else if (!/(rano|rana|z rana)/.test(t) && hh >= 1 && hh <= 5) hh += 12;
      return hh;
    };
    if ((m = t.match(/\bwpol do (\d{1,2}|\w+)/))) {
      let x = /^\d+$/.test(m[1]) ? +m[1] : null;
      if (x === null) for (const k in ORD) if (m[1].startsWith(k)) x = ORD[k];
      if (x) return { min: adj(x - 1) * 60 + 30, raw: m[0] };
    }
    if ((m = t.match(/\b(\d{1,2}):(\d{2})\b/))) { h = +m[1]; min = +m[2]; s = m[0]; }
    else if ((m = t.match(new RegExp('\\b' + ORD_RE + '(?:\\s+(\\d{1,2}))?\\b')))) { h = ORD[m[1]]; min = m[2] && +m[2] < 60 ? +m[2] : 0; s = m[0]; if (/^\d/.test(t.slice(t.indexOf(m[0]) + m[0].length).trim()) && !m[2]) { } }
    else if ((m = t.match(new RegExp('\\b(?:o|na|godz\\w*|okolo|kolo|przed|po)\\s+(?:godz\\w*\\s+)?(\\d{1,2})(?:\\s+(\\d{2}))?\\b' + NOTQ)))) { h = +m[1]; min = m[2] ? +m[2] : 0; s = m[0]; }
    else if ((m = t.match(/\b(\d{1,2})\s+(rano|wieczorem|po poludniu)\b/))) { h = +m[1]; s = m[0]; }
    else if ((m = t.match(new RegExp('\\b(?:jutr\\w*|dzis\\w*|pojutrze|poniedzial\\w*|wtor\\w*|srod\\w*|czwart\\w*|piat\\w*|sobot\\w*|niedziel\\w*)\\s+(\\d{1,2})(?:\\s+(\\d{2}))?\\b' + NOTQ)))) { h = +m[1]; min = m[2] ? +m[2] : 0; s = m[0].replace(/^\S+\s+/, ''); }
    if (h === null || h > 24 || min > 59) return null;
    if (h === 24) h = 0;
    return { min: adj(h) * 60 + min, raw: s };
  }
  const WD = [['niedziel', 0], ['poniedzial', 1], ['wtor', 2], ['srod', 3], ['czwart', 4], ['piat', 5], ['sobot', 6]];
  const MON = ['stycz', 'lut', 'marc', 'kwiet', 'maj', 'czerw', 'lip', 'sierp', 'wrzes', 'pazdz', 'listop', 'grud'];
  function parseDate(t, now) {
    let m;
    if (/\b(dzis|dzisiaj|teraz|zaraz|od reki|natychmiast)\b/.test(t)) return { iso: iso(now), raw: (t.match(/\b(dzis|dzisiaj|teraz|zaraz|od reki|natychmiast)\b/) || [''])[0] };
    if ((m = t.match(/\bpojutrze\b/))) return { iso: iso(addDays(now, 2)), raw: m[0] };
    if ((m = t.match(/\bjutr\w*\b/))) return { iso: iso(addDays(now, 1)), raw: m[0] };
    if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})\b/))) { const d = +m[1], mo = +m[2]; if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) { let x = new Date(now.getFullYear(), mo - 1, d); if (x < addDays(now, -1)) x = new Date(now.getFullYear() + 1, mo - 1, d); return { iso: iso(x), raw: m[0] }; } }
    if ((m = t.match(/\b(\d{1,2})\s+(stycz|lut|marc|kwiet|maj|czerw|lip|sierp|wrzes|pazdz|listop|grud)\w*/))) {
      const mo = MON.indexOf(m[2]); let x = new Date(now.getFullYear(), mo, +m[1]); if (x < addDays(now, -1)) x = new Date(now.getFullYear() + 1, mo, +m[1]); return { iso: iso(x), raw: m[0] };
    }
    for (const [k, wd] of WD) {
      const r = new RegExp('\\b(?:w |we |na |w przyszl\\w* |na przyszl\\w* )?' + k + '\\w*');
      if ((m = t.match(r))) { let diff = (wd - now.getDay() + 7) % 7; if (diff === 0) diff = 7; if (/przyszl/.test(m[0]) && diff < 3) diff += 7; return { iso: iso(addDays(now, diff)), raw: m[0] }; }
    }
    return null;
  }
  function parseQty(t, loose) {
    let m;
    if ((m = t.match(/\b(\d{1,5})\s*(?:x\s*)?(?:szt\w*|sztuk\w*|kompl\w*)?\s*(?:\w+\s+)?(?:\w*palet\w*|szt\w*|euro\w*|epal\w*|przemysl\w*|jednoraz\w*|eksport\w*)/))) return +m[1];
    if ((m = t.match(/\b(?:potrzebuje|chce|chcialbym|chcialabym|poprosze|zamawiam|zamowie|wezme|biore|dawaj|daj|razem|ilosc|ilosci)\s+(\d{1,5})\b(?!\s*:)/))) return +m[1];
    if (loose && (m = t.match(/^(?:\w+\s+){0,3}?(\d{1,5})(?:\s+\w+){0,2}$/))) return +m[1];
    return null;
  }
  function parse(text, now, loose) {
    let t = prep(text);
    const r = { t };
    const tm = parseTime(t); if (tm) { r.time = tm.min; t = t.replace(tm.raw, ' '); }
    const dt = parseDate(t, now); if (dt) { r.date = dt.iso; t = t.replace(dt.raw, ' '); }
    t = t.replace(/\s+/g, ' ').trim();
    r.product = findProduct(t);
    r.qty = parseQty(t, loose);
    r.rest = t;
    return r;
  }

  /* ---------- magazyn (store) ---------- */
  function seed(now) {
    now = now || new Date();
    return {
      v: 1, seq: 0, created: Date.now(),
      products: PRODUCTS.map(p => ({ id: p.id, name: p.name, size: p.size, price: p.price, stock: p.stock, deliveryDate: iso(addDays(now, 3)), deliveryQty: p.id === 'epal' ? 200 : 100 })),
      orders: [], payments: [], pickups: [], log: [{ at: Date.now(), type: 'reset', text: 'Demo uruchomione — magazyn z przykładowymi stanami.' }]
    };
  }
  function memoryStorage() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }
  function createStore(storage, clock) {
    storage = storage || memoryStorage();
    clock = clock || (() => Date.now());
    let cache = null;
    const load = () => { try { cache = JSON.parse(storage.getItem(KEY)); } catch (e) { cache = null; } if (!cache || cache.v !== 1) { cache = seed(new Date(clock())); save(); } return cache; };
    const save = () => { storage.setItem(KEY, JSON.stringify(cache)); };
    const S = {
      get: () => load(),
      reset() { cache = seed(new Date(clock())); save(); return cache; },
      product: id => load().products.find(p => p.id === id),
      log(type, text, extra) { const d = load(); d.log.unshift(Object.assign({ at: clock(), type, text }, extra || {})); d.log = d.log.slice(0, 250); save(); },
      held(id) { return load().orders.filter(o => o.product === id && ['rezerwacja', 'akceptacja', 'opłacone'].includes(o.status)).reduce((a, o) => a + o.qty, 0); },
      available(id, date) { const p = S.product(id); if (!p) return 0; let s = p.stock + (date && p.deliveryDate && date >= p.deliveryDate ? +p.deliveryQty || 0 : 0); return Math.max(0, s - S.held(id)); },
      sweep() {
        const d = load(), t = clock(); let ch = 0;
        d.orders.forEach(o => { if (o.status === 'rezerwacja' && o.expiresAt <= t) { o.status = 'wygasła'; ch++; d.log.unshift({ at: t, type: 'expire', text: `Rezerwacja ${o.no} wygasła (brak wpłaty) — ${o.qty} szt. wraca na stan.` }); } });
        if (ch) save(); return ch;
      },
      reserve({ product, qty, date, time, flagged, customer }) {
        const d = load(), p = d.products.find(x => x.id === product), t = clock();
        d.seq++;
        const o = { id: 'o' + d.seq + '_' + t.toString(36), no: 'JF-' + String(1000 + d.seq), product, name: p.name, qty, unit: p.price, total: qty * p.price, date, time: hm(time),
          status: flagged ? 'akceptacja' : 'rezerwacja', createdAt: t, expiresAt: flagged ? t + 24 * 3600e3 : t + RES_MIN * 60e3, customer: customer || 'Klient (demo)', flagged: !!flagged };
        d.orders.unshift(o);
        d.log.unshift({ at: t, type: flagged ? 'flag' : 'reserve', text: flagged ? `Zamówienie ${o.no}: ${qty} × ${p.name} — duże zamówienie, czeka na akceptację człowieka.` : `Rezerwacja ${o.no}: ${qty} × ${p.name} na ${short(date)} ${o.time} (ważna 30 min).` });
        save(); return o;
      },
      order: id => load().orders.find(o => o.id === id || o.no === id),
      setCustomer(id, name) { const o = S.order(id); if (o && name) { o.customer = name; save(); } },
      accept(id) { const d = load(), o = d.orders.find(x => x.id === id); if (!o || o.status !== 'akceptacja') return null; o.status = 'rezerwacja'; o.expiresAt = clock() + RES_MIN * 60e3; o.acceptedAt = clock(); d.log.unshift({ at: clock(), type: 'accept', text: `Człowiek zaakceptował ${o.no} — klient dostał link do płatności.` }); save(); return o; },
      reject(id) { const d = load(), o = d.orders.find(x => x.id === id); if (!o || !['akceptacja', 'rezerwacja'].includes(o.status)) return null; o.status = 'odrzucone'; d.log.unshift({ at: clock(), type: 'reject', text: `Zamówienie ${o.no} odrzucone / anulowane — towar wraca na stan.` }); save(); return o; },
      cancel(id) { return S.reject(id); },
      expireNow(id) { const d = load(), o = d.orders.find(x => x.id === id); if (o && o.status === 'rezerwacja') { o.expiresAt = clock() - 1; save(); } return S.sweep(); },
      pay(id, method) {
        S.sweep();
        const d = load(), o = d.orders.find(x => x.id === id), t = clock();
        if (!o) return { ok: false, reason: 'Nie znaleziono zamówienia.' };
        if (o.status === 'wygasła') return { ok: false, reason: 'Rezerwacja wygasła — towar wrócił na stan. Złóż zamówienie jeszcze raz.' };
        if (o.status === 'opłacone' || o.status === 'wydane') return { ok: true, order: o };
        if (o.status !== 'rezerwacja') return { ok: false, reason: 'To zamówienie nie czeka na płatność.' };
        o.status = 'opłacone'; o.paidAt = t; o.code = genCode(o, t); o.locker = 1 + (parseInt(o.code, 10) % 12);
        o.sig = sign(o);
        d.payments.unshift({ id: 'PAY-' + t.toString(36).toUpperCase(), order: o.no, amount: o.total, method: method || 'BLIK (TEST)', at: t, test: true });
        d.log.unshift({ at: t, type: 'pay', text: `Wpłata TESTOWA ${zl(o.total)} za ${o.no} (${method || 'BLIK'}) — wystawiono kod odbioru.` });
        save(); return { ok: true, order: o };
      },
      issue(code, ext) {
        S.sweep();
        const d = load(), t = clock();
        const c = String(code || '').replace(/\D/g, '');
        const o = d.orders.find(x => x.code === c);
        if (!o) {
          if (ext && verifyExt(ext) && d.pickups.some(x => x.order === ext.o)) return { ok: false, reason: `Ten kod został już wykorzystany (${ext.o}).` };
          if (ext && verifyExt(ext)) { d.pickups.unshift({ order: ext.o, qty: +ext.q, name: (PRODUCTS.find(p => p.id === ext.p) || {}).name || ext.p, locker: 1 + (parseInt(ext.k, 10) % 12), at: t, ext: true }); d.log.unshift({ at: t, type: 'issue', text: `Wydano ${ext.o} (${ext.q} szt.) na podstawie podpisanego kodu QR z innego urządzenia.` }); save(); return { ok: true, external: true, order: { no: ext.o, qty: +ext.q, name: (PRODUCTS.find(p => p.id === ext.p) || {}).name || ext.p, date: ext.d, time: ext.t, locker: 1 + (parseInt(ext.k, 10) % 12), code: ext.k } }; }
          return { ok: false, reason: 'Nieprawidłowy kod odbioru.' };
        }
        if (o.status === 'wydane') return { ok: false, reason: `Ten kod został już wykorzystany (${o.no} wydane ${new Date(o.issuedAt).toLocaleString('pl-PL')}).`, order: o };
        if (o.status !== 'opłacone') return { ok: false, reason: 'Zamówienie nie jest opłacone.' };
        const p = d.products.find(x => x.id === o.product);
        o.status = 'wydane'; o.issuedAt = t; p.stock = Math.max(0, p.stock - o.qty);
        d.pickups.unshift({ order: o.no, qty: o.qty, name: o.name, locker: o.locker, at: t });
        d.log.unshift({ at: t, type: 'issue', text: `Paczkomat Joker: wydano ${o.no} — skrytka ${o.locker}, ${o.qty} × ${o.name}. Stan ${p.name}: ${p.stock} szt.` });
        save(); return { ok: true, order: o };
      },
      changeQty(id, qty) {
        S.sweep();
        const o0 = S.order(id);
        if (!o0 || o0.status !== 'rezerwacja') return { ok: false, reason: 'Tej rezerwacji nie da się już zmienić.' };
        qty = Math.floor(+qty || 0);
        if (qty < 1) return { ok: false, reason: 'Minimalnie 1 sztuka. Żeby zrezygnować, użyj „Cofnij zamówienie”.' };
        if (qty > BIG) return { ok: false, reason: `Powyżej ${BIG} szt. zamówienie zatwierdza człowiek — napisz w czacie nową ilość.` };
        const free = S.available(o0.product, o0.date) + o0.qty;
        if (qty > free) return { ok: false, reason: `Na ten termin mam maksymalnie ${free} szt.`, max: free };
        const d = load(), o = d.orders.find(x => x.id === id), old = o.qty;
        o.qty = qty; o.total = qty * o.unit;
        d.log.unshift({ at: clock(), type: 'edit', text: `Klient zmienił ilość w ${o.no}: ${old} → ${qty} szt. (${zl(o.total)}).` });
        save(); return { ok: true, order: o };
      },
      updateProduct(id, patch) { const d = load(), p = d.products.find(x => x.id === id); if (!p) return; Object.assign(p, patch); d.log.unshift({ at: clock(), type: 'stock', text: `Zmieniono ${p.name}: stan ${p.stock}, cena ${zl(p.price)}, dostawa ${p.deliveryQty} szt. ${p.deliveryDate ? short(p.deliveryDate) : ''}.` }); save(); }
    };
    return S;
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function genCode(o, t) { let r; try { const a = new Uint32Array(1); (typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto).getRandomValues(a); r = a[0]; } catch (e) { r = Math.floor(Math.random() * 4e9); } return String(100000 + (r % 900000)); }
  const sign = o => hash(SALT + '|' + o.no + '|' + o.code + '|' + o.product + '|' + o.qty);
  const verifyExt = e => e && e.o && e.k && e.c === hash(SALT + '|' + e.o + '|' + e.k + '|' + e.p + '|' + e.q);
  function qrPayload(o, base) { return (base || '') + 'odbior.html#o=' + encodeURIComponent(o.no) + '&k=' + o.code + '&p=' + o.product + '&q=' + o.qty + '&d=' + o.date + '&t=' + encodeURIComponent(o.time) + '&c=' + o.sig; }
  function parsePayload(s) {
    s = String(s || '').trim();
    const i = s.indexOf('#'); const h = i >= 0 ? s.slice(i + 1) : (/^o=/.test(s) ? s : '');
    if (!h) { const c = s.replace(/\D/g, ''); return c.length === 6 ? { k: c } : null; }
    const o = {}; h.split('&').forEach(kv => { const [k, v] = kv.split('='); if (k) o[k] = decodeURIComponent(v || ''); });
    return o.k ? o : null;
  }

  /* ---------- rozmowa ---------- */
  const YES = /\b(tak|ok|okej|okay|dobra|dobrze|pasuje|zgoda|jasne|super|moze byc|potwierdzam|biore|wchodze|niech bedzie|git|spoko)\b/;
  const NO = /\b(nie|niee|nope|rezygnuje)\b/;
  function createSession({ store, now }) {
    now = now || (() => new Date());
    let st = { product: null, qty: null, date: null, time: null, offer: null, orderId: null, active: false, customer: null };
    const P = id => store.product(id);
    const pname = id => (PRODUCTS.find(p => p.id === id) || {}).short;
    const r = (say, extra) => Object.assign({ say, state: Object.assign({}, st) }, extra || {});
    function resetOrder() { st = { product: null, qty: null, date: null, time: null, offer: null, orderId: null, active: false, customer: st.customer, lastOrder: st.lastOrder }; }
    function askNext() {
      if (!st.product) return r('Jasne! Jakie palety: euro EPAL, przemysłowe, jednorazowe czy półpalety?', { chips: ['palety euro EPAL', 'przemysłowe', 'jednorazowe', 'półpalety'] });
      if (!st.qty) return r(`Ile sztuk ${pname(st.product).replace(/^palety/, 'palet').replace(/^półpalety/, 'półpalet')} potrzebujesz?`, { chips: ['10', '24', '50'] });
      if (!st.date) return r('Na kiedy? Dziś, jutro, czy inny dzień?', { chips: ['jutro', 'pojutrze', 'w piątek'] });
      if (st.time == null) return r(`Na którą godzinę ${dayLabel(st.date, now()).replace(/ \(.*/, '')}? Rampa samoobsługowa działa codziennie od 6:00 do 22:00.`, { chips: ['na 9:00', 'o 12', 'na 16:30'] });
      return check();
    }
    function check() {
      const n = now(), today = iso(n), nowMin = n.getHours() * 60 + n.getMinutes();
      if (st.date < today) { st.date = null; return r('Ta data już minęła. Na kiedy mam przygotować towar?'); }
      if (st.time < OPEN || st.time >= CLOSE) { const t = st.time; st.time = null; return r(`O ${hm(t)} rampa jest zamknięta. Wydajemy codziennie od 6:00 do 22:00. Na którą godzinę?`, { chips: ['na 7:00', 'na 9:00', 'na 15:00'] }); }
      if (st.date === today && st.time < nowMin + 30) { st.time = null; return r(`Dziś najwcześniej mogę przygotować towar na ${hm(Math.min(CLOSE - 30, Math.ceil((nowMin + 30) / 15) * 15))}. Na którą godzinę?`); }
      if (st.qty < 1) { st.qty = null; return askNext(); }
      const p = P(st.product), av = store.available(st.product, st.date);
      if (st.qty > av) {
        const later = p.deliveryDate && st.date < p.deliveryDate && store.available(st.product, p.deliveryDate) >= st.qty ? p.deliveryDate : null;
        st.offer = { partial: av, later };
        let s = av > 0 ? `Na ${dayLabel(st.date, n)} mam na stanie tylko ${av} szt. (${pname(st.product)}). ` : `Na ${dayLabel(st.date, n)} niestety nie mam już ${pname(st.product)}. `;
        const opts = [];
        if (av > 0) opts.push(`mogę od razu zarezerwować ${av} szt.`);
        if (later) opts.push(`całe ${st.qty} szt. będzie od ${dayLabel(later, n)}, bo wtedy mamy dostawę`);
        if (!opts.length) { st.offer = null; st.qty = null; return r(s + 'Mogę przyjąć mniejszą ilość albo zamówienie na późniejszy termin. Ile sztuk?'); }
        const chips = []; if (av > 0) chips.push(`biorę ${av}`); if (later) chips.push('termin z dostawą');
        return r(s + opts.join(', albo ').replace(/^./, c => c.toUpperCase()) + '. Co wybierasz?', { chips, outOfStock: true });
      }
      const big = st.qty > BIG;
      const o = store.reserve({ product: st.product, qty: st.qty, date: st.date, time: st.time, flagged: big, customer: st.customer });
      st.orderId = o.id; const done = Object.assign({}, st); resetOrder(); st.lastOrder = o.id;
      if (big) return r(`To duże zamówienie: ${o.qty} × ${o.name} na ${dayLabel(o.date, n)}, na ${o.time}, razem ${zl(o.total)}. Takie zamówienia zatwierdza człowiek, więc przekazałem je do akceptacji. Towar jest wstępnie zatrzymany, a link do płatności pojawi się tutaj zaraz po zatwierdzeniu.`, { ui: { type: 'approval', orderId: o.id }, done });
      return r(`Tak, nie ma problemu! ${o.qty} × ${o.name} na ${dayLabel(o.date, n)}, na ${o.time}. Razem ${zl(o.total)} brutto. Zarezerwowałem towar na 30 minut — opłać zamówienie poniżej, a od razu dostaniesz kod QR do odbioru.`, { ui: { type: 'pay', orderId: o.id }, done });
    }
    function info(t) {
      if (/\b(cennik|cen[ay]?|ile kosztuj\w*|koszt\w*|po ile|jaka cena)\b/.test(t)) {
        const id = findProduct(t); const d = store.get().products;
        if (id) { const p = d.find(x => x.id === id); return r(`${p.name} (${p.size}) kosztuje ${zl(p.price)} brutto za sztukę.`); }
        return r('Cennik: ' + d.map(p => `${p.name} ${zl(p.price)}`).join(', ') + '. Ceny brutto za sztukę.');
      }
      if (/\b(ile (macie|masz|jest|zostalo)|na stanie|stan\w* magazyn\w*|dostepn\w*|czy macie|czy jest)\b/.test(t) && parseQty(t) == null) {
        const id = findProduct(t), d = store.get().products, today = iso(now());
        if (id) { const p = d.find(x => x.id === id); return r(`Na dziś mam dostępne ${store.available(id, today)} szt. (${pname(id)}). Kolejna dostawa ${p.deliveryQty} szt. ${dayLabel(p.deliveryDate, now())}.`); }
        return r('Dostępne od ręki: ' + d.map(p => `${p.name} ${store.available(p.id, today)} szt.`).join(', ') + '.');
      }
      if (/\b(godzin\w* (otwar|prac)\w*|kiedy (otwar|czynn)\w*|otwarte|czynne|do ktorej)\b/.test(t)) return r('Rampa samoobsługowa i Paczkomat Joker działają codziennie od 6:00 do 22:00. Zamówienia przyjmuję przez całą dobę.');
      if (/\b(gdzie|adres|dojazd|lokalizac\w*)\b/.test(t)) return r('Magazyn demo: ulica Paletowa 7, brama numer 2 (adres przykładowy). Na miejscu skanujesz kod QR w Paczkomacie Joker i odbierasz palety z rampy.');
      if (/\b(jak (odebrac|odbior)|odbior|paczkomat|kod qr)\b/.test(t) && !st.active) return r('Po opłaceniu dostajesz kod QR. Podjeżdżasz o umówionej godzinie, skanujesz kod w Paczkomacie Joker, otwiera się skrytka z dokumentem wydania, a palety czekają na rampie.');
      if (/\b(czlowiek\w*|konsultant\w*|pracownik\w*|kierownik\w*|szef\w*)\b/.test(t)) return r('Przekazałem prośbę o kontakt do magazynu, człowiek oddzwoni w godzinach pracy. A jeśli chcesz, przyjmę zamówienie od razu, zajmie to minutę.');
      if (/\b(faktur\w*|vat|nip)\b/.test(t)) return r('Fakturę VAT wystawię po płatności, wystarczy podać NIP przy odbiorze. W tym demo faktura jest tylko symulowana.');
      return null;
    }
    return {
      state: () => st,
      start: () => r('Dzień dobry! Tu automatyczna obsługa zamówień JOKERAl Firma. Powiedz, czego potrzebujesz, na przykład: „10 palet euro na jutro na 9:00”.', { chips: ['potrzebuję 10 palet euro na jutro na 9:00', 'ile kosztują półpalety?', 'ile macie palet przemysłowych?'] }),
      handle(text) {
        const n = now(); store.sweep();
        const raw = prep(text);
        if (!raw) return r('Nie dosłyszałem. Powtórz, proszę.');
        if (/\b(anuluj\w*|odwolaj\w*|rezygnuj\w*|zacznij od nowa|od nowa|nowe zamowienie|reset)\b/.test(raw)) {
          if (st.lastOrder) { const o = store.order(st.lastOrder); if (o && ['rezerwacja', 'akceptacja'].includes(o.status) && /anul|odwol|rezyg/.test(raw)) { store.cancel(o.id); resetOrder(); st.lastOrder = null; return r(`Anulowałem rezerwację ${o.no}. Towar wrócił na stan. Mogę w czymś jeszcze pomóc?`, { ui: { type: 'cancelled', orderId: o.id } }); } }
          resetOrder(); return r('Dobrze, zaczynamy od nowa. Czego potrzebujesz?');
        }
        if (/\b(ponownie|jeszcze raz|powtorz\w* zamowienie)\b/.test(raw) && st.lastOrder) {
          const o = store.order(st.lastOrder);
          if (o) { st.product = o.product; st.qty = o.qty; st.date = o.date; st.time = +o.time.slice(0, 2) * 60 + +o.time.slice(3); st.active = true; return askNext(); }
        }
        if (st.lastOrder && /\b(zmien\w*|jednak|popraw\w*|zamiast)\b/.test(raw)) {
          const lo = store.order(st.lastOrder), m = raw.match(/\b(\d{1,5})\b(?!\s*:)/g);
          if (lo && lo.status === 'rezerwacja' && m) {
            const q = +m[m.length - 1], c = store.changeQty(lo.id, q);
            if (c.ok) return r(`Jasne, zmieniłem: ${c.order.qty} × ${c.order.name}, razem ${zl(c.order.total)}. Rezerwacja dalej trwa.`, { ui: { type: 'pay', orderId: lo.id } });
            return r(c.reason);
          }
        }
        const cm = raw.match(/\b(?:firma|z firmy|nazywam sie|na nazwisko|na firme|jestem)\s+([a-z0-9][a-z0-9 ]{1,40}?)(?=\s+(?:i|potrzebuje|chce|chcialbym|poprosze|zamawiam)\b|$)/);
        if (cm) st.customer = cm[1].replace(/\b\w/g, c => c.toUpperCase());
        const p = parse(text, n, !!(st.active && st.product && !st.qty) || !!st.offer);
        // odpowiedź na propozycję przy braku towaru
        if (st.offer) {
          const of = st.offer;
          if (p.date) { st.date = p.date; if (p.qty) st.qty = p.qty; if (p.time != null) st.time = p.time; st.offer = null; return askNext(); }
          if (of.later && /\b(dostaw\w*|pozniej\w*|termin\w*|poczekam|calosc|cale|wszystk\w*)\b/.test(raw)) { st.date = of.later; st.offer = null; return askNext(); }
          if (p.qty) { st.qty = p.qty; st.offer = null; return askNext(); }
          if (of.partial > 0 && (YES.test(raw) || /\b(dostepn\w*|tyle|ile jest|reszt\w*)\b/.test(raw))) { st.qty = of.partial; st.offer = null; return askNext(); }
          if (NO.test(raw)) { resetOrder(); return r('Rozumiem. Gdybyś zmienił zdanie albo potrzebował innych palet, po prostu napisz.'); }
        }
        if (/^(dziekuje|dzieki|to wszystko|do widzenia|na razie|czesc|nara)\b/.test(raw) && !p.qty && !p.product) return r(st.lastOrder ? 'Dziękuję za zamówienie! Do zobaczenia przy odbiorze.' : 'Dzięki, do usłyszenia! Gdybyś potrzebował palet, jestem tu całą dobę.');
        if (/^(dzien dobry|witam|hej|siema|halo|elo|czesc|dobry wieczor)$/.test(raw)) return r('Dzień dobry! Jakich palet potrzebujesz i na kiedy?');
        const hasOrderInfo = p.product || p.qty || p.date || p.time != null || /\bpalet\w*/.test(raw) || /\b(zamow\w*|potrzebuj\w*|zarezerw\w*)\b/.test(raw);
        if (!hasOrderInfo || (!st.active && !p.qty && !p.date && p.time == null)) { const i = info(raw); if (i) return i; }
        if (!hasOrderInfo && !st.active) return r('Przyjmuję zamówienia na palety euro EPAL, przemysłowe, jednorazowe i półpalety. Powiedz na przykład: „20 palet jednorazowych na jutro na 8:00”. Mogę też podać cennik albo stany.', { chips: ['cennik', 'ile macie na stanie?'] });
        if (!hasOrderInfo && st.active) { const i = info(raw); if (i) return i; return Object.assign(askNext(), { say: 'Nie zrozumiałem. ' + askNext().say }); }
        st.active = true;
        if (p.product) st.product = p.product;
        if (p.qty) st.qty = p.qty;
        if (p.date) st.date = p.date;
        if (p.time != null) st.time = p.time;
        if (p.time != null && !st.date && !p.date) {
          const nm = n.getHours() * 60 + n.getMinutes(); if (p.time > nm + 30) st.date = iso(n);
        }
        return askNext();
      }
    };
  }

  return { pickupWindow: window_, PRODUCTS, KEY, RES_MIN, BIG, norm, prep, wordsToNums, parseTime, parseDate, parseQty, parse, iso, hm, zl, dayLabel, short, createStore, memoryStorage, createSession, qrPayload, parsePayload, verifyExt, seed, findProduct };
});
