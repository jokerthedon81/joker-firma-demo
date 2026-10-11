/* JOKERAl Rodzina — pośrednik dzieci ↔ mama (reguły, bez LLM). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./firma-engine.js'));
  else root.JokerRodzina = factory(root.JokerFirma);
})(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';
  const CHILDREN = [
    { id: 'jasiu', name: 'Jasiu', emoji: '👦', tg: '@jasiu_firma', registered: true },
    { id: 'ola', name: 'Ola', emoji: '👧', tg: '@ola_k', registered: true },
    { id: 'obcy', name: 'Nieznany numer', emoji: '❓', tg: '+48 7xx xxx 913', registered: false }
  ];
  const KIND = {
    pieniadze: { icon: '💸', title: 'Pieniądze', slots: ['amount', 'purpose', 'deadline'] },
    klucze: { icon: '🔑', title: 'Klucze', slots: ['where', 'when'] },
    odbior: { icon: '🚗', title: 'Odbiór', slots: ['where', 'when'] },
    zakupy: { icon: '🛒', title: 'Zakupy', slots: ['items'] },
    powrot: { icon: '🏠', title: 'Powrót do domu', slots: ['when'] }
  };
  const Q = {
    pieniadze: { amount: 'Ile pieniędzy potrzebujesz?', purpose: 'Na co dokładnie?', deadline: 'Do kiedy są potrzebne? (np. dziś do 18:00)' },
    klucze: { where: 'Gdzie zostawiasz klucze albo gdzie mają na Ciebie czekać? (np. u sąsiadki, pod wycieraczką)', when: 'O której?' },
    odbior: { where: 'Skąd mama ma Cię odebrać?', when: 'O której?' },
    zakupy: { items: 'Co trzeba kupić?' },
    powrot: { when: 'O której wrócisz do domu?' }
  };
  const detect = t => {
    if (/(pieniadz|pieniedz|kas[ay]\b|hajs|\bzl\b|zlotych|zlote|zlotow|przelew|paysafe|psc|doladow|kieszonkow|kod\w* (do|na|paysafe)|na konto)/.test(t)) return 'pieniadze';
    if (/klucz/.test(t)) return 'klucze';
    if (/(odbierz|odebrac|odbior|przyjedz\w* po|podjedz\w* po|zabierz\w* mnie|podwiez|przyjechac po)/.test(t)) return 'odbior';
    if (/(\bkup|zakup|kupic|kupisz|brakuje|skonczyl\w*|nie ma (juz )?(mleka|chleba|masla|jajek))/.test(t)) return 'zakupy';
    if (/(wroc\w*|bede w domu|spozni\w*|zostane|nocuj\w*|u kolegi|u kolezanki|trening|wracam)/.test(t)) return 'powrot';
    return null;
  };
  const WHERE = /\b(pod wycieraczk\w*|u sasiad\w*( \w+)?|w skrzynce\w*( \w+)?|w doniczce|pod doniczk\w*|u babci|u dziadk\w*|w szkole|pod szkol\w*|przed szkol\w*|ze szkoly|z treningu|z basenu|z orlika|z kina|z galerii|z dworca|na dworcu|na przystanku|w galerii|na treningu|w schowku|u (pani|pana) \w+|w samochodzie|w garazu|ze? \w+ (na|przy) \w+)\b/;
  const ORIG = { 'u sasiadki': 'u sąsiadki', 'pod wycieraczka': 'pod wycieraczką', 'pod wycieraczke': 'pod wycieraczką', 'ze szkoly': 'ze szkoły', 'w szkole': 'w szkole', 'pod szkola': 'pod szkołą', 'przed szkola': 'przed szkołą', 'w skrzynce': 'w skrzynce', 'u babci': 'u babci', 'z treningu': 'z treningu' };
  const pretty = s => ORIG[s] || s.replace(/sasiad/g, 'sąsiad').replace(/szkoly/g, 'szkoły').replace(/szkola/g, 'szkołą');
  function amountOf(t, loose) { let m = t.match(/\b(\d{1,5})\s*(zl\w*|pln)\b/); if (m) return +m[1]; if (loose && (m = t.match(/\b(\d{1,5})\b(?!\s*:)/))) return +m[1]; return null; }
  function purposeOf(t, raw) {
    if (/paysafe|psc/.test(t)) return 'kod Paysafecard' + (/firm/.test(t) ? ' do firmy (zakup w Żabce)' : (/zabk/.test(t) ? ' (zakup w Żabce)' : ''));
    const m = raw.match(/\b(?:na|za)\s+(?!dziś|dzis|jutro|godzin|\d)([\wąćęłńóśźż ]{3,40}?)(?=[,.!?]| do | na | dziś| dzis| jutro|$)/i);
    return m ? m[1].trim() : null;
  }
  function deadlineOf(t, now) {
    const d = F.parseDate(t, now), tm = F.parseTime(t.replace(/\bdo (\d{1,2})\b/, 'o $1'));
    if (!d && !tm) return null;
    const dd = d ? d.iso : F.iso(now);
    return { iso: dd, time: tm ? F.hm(tm.min) : null, label: (dd === F.iso(now) ? 'dziś' : F.dayLabel(dd, now).replace(/ \(.*/, '')) + (tm ? ' do ' + F.hm(tm.min) : '') };
  }
  function whenOf(t, now) {
    const d = F.parseDate(t, now), tm = F.parseTime(t);
    if (!tm && !d) return null;
    const dd = d ? d.iso : F.iso(now);
    return { iso: dd, time: tm ? F.hm(tm.min) : null, label: (dd === F.iso(now) ? (tm ? 'dziś' : 'dziś') : F.dayLabel(dd, now).replace(/ \(.*/, '')) + (tm ? ' o ' + F.hm(tm.min) : '') };
  }
  function createFamily(opts) {
    opts = opts || {};
    const now = opts.now || (() => new Date());
    const conv = {}; // childId -> {kind, data, waiting}
    let seq = 0;
    const notifs = [];
    const S = {
      children: CHILDREN,
      notifs,
      handle(childId, text) {
        const ch = CHILDREN.find(c => c.id === childId);
        const t = F.prep(text), n = now(), out = { say: [], notify: null };
        if (!ch || !ch.registered) {
          const money = /pieniadz|kod|paysafe|psc|blik|przelew|zl/.test(t);
          out.say.push('Nie przyjmuję próśb z nieznanych kont. Ten bot obsługuje tylko zapisane konta dzieci. Jeśli jesteś z rodziny, poproś mamę o dodanie Twojego konta.');
          out.notify = mk(ch || CHILDREN[2], 'alarm', { text: text }, true, money ? '⚠️ Nieznane konto prosi o pieniądze lub kod. To może być oszustwo „na dziecko”. Nic nie wysyłaj — zadzwoń do dziecka na znany numer.' : '⚠️ Nieznane konto próbowało się skontaktować. Zablokowano.');
          return out;
        }
        if (/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/.test(text.replace(/-/g, ' '))) out.say.push('⚠️ Nie wklejaj tu kodów PIN — kod Paysafecard to jak gotówka. Nie przekazuję kodów nikomu.');
        if (/(wyslij|przeslij|daj|podaj)\w* (mi )?(kod|pin|pieniadz|kas|przelew)/.test(t)) out.say.push('Sam nie wysyłam pieniędzy ani kodów — mogę tylko przekazać prośbę mamie, a ona zdecyduje i zapłaci sama.');
        let c = conv[childId];
        const k = detect(t);
        if (!c || (k && k !== c.kind && !c.waiting)) { if (!k) { out.say.push(`Cześć ${ch.name}! Mogę przekazać mamie sprawę: klucze, powrót do domu, odbiór, zakupy albo pieniądze. Napisz, o co chodzi.`); return out; } c = conv[childId] = { kind: k, data: {}, waiting: null }; }
        else if (k && k !== c.kind && c.waiting) { c = conv[childId] = { kind: k, data: {}, waiting: null }; }
        const D = c.data, loose = !!c.waiting;
        const raw = String(text);
        const w = c.waiting;
        if (c.kind === 'pieniadze') {
          const a = amountOf(t, w === 'amount'); if (a) D.amount = a;
          const p = purposeOf(t, raw); if (p) D.purpose = p; else if (w === 'purpose' && !a) D.purpose = raw.replace(/^na\s+/i, '').trim();
          const dl = deadlineOf(t, n); if (dl) D.deadline = dl; else if (w === 'deadline' && /(obojetnie|kiedykolwiek|nie spieszy|bez pospiechu)/.test(t)) D.deadline = { label: 'bez pośpiechu', iso: null };
        } else if (c.kind === 'klucze' || c.kind === 'odbior') {
          const m = t.match(WHERE); if (m) D.where = pretty(m[0]); else if (w === 'where') D.where = raw.trim().replace(/[.!]$/, '');
          const wh = whenOf(t, n); if (wh) D.when = wh;
        } else if (c.kind === 'zakupy') {
          const m = raw.match(/\b(?:kup(?:ić|ic|isz)?|kupi(?:ła|la|łabyś|labys)?|zakupy:?|brakuje|potrzebuj\w*)\s+(?:mi\s+|nam\s+)?(.{2,80})/i);
          if (m && !/^(zakupy|zakupów)\s*$/i.test(m[1])) D.items = m[1].replace(/[.!?]+$/, '').replace(/\s+(na|do)\s+(dzi\w+|jutro).*$/i, '').trim();
          else if (/nie ma (juz )?(\w+)/.test(t)) D.items = t.match(/nie ma (?:juz )?(\w+)/)[1];
          else if (w === 'items') D.items = raw.trim();
          const wh = whenOf(t, n); if (wh) D.when = wh;
        } else if (c.kind === 'powrot') {
          const wh = whenOf(t, n); if (wh) D.when = wh;
          const why = raw.match(/\b(?:bo|mam|po|z)\s+(trening\w*|zajęci\w*|zajeci\w*|korepetycj\w*|kolegą|kolega|koleżanką|imprez\w*|kin\w*)/i); if (why) D.why = why[1].replace(/^kolegą$/i, 'z kolegą').replace(/^koleżanką$/i, 'z koleżanką');
          if (/u kolegi|u kolezanki|nocuj/.test(t)) D.why = (D.why ? D.why + ', ' : '') + (t.match(/u kolegi|u kolezanki|nocuje\w*/) || [''])[0].replace('kolezanki', 'koleżanki');
        }
        const miss = KIND[c.kind].slots.find(s => !D[s]);
        if (miss) { c.waiting = miss; out.say.push(Q[c.kind][miss]); return out; }
        // komplet -> powiadomienie
        const urgent = isUrgent(c.kind, D, t, n);
        out.notify = mk(ch, c.kind, D, urgent);
        out.say.push(`Gotowe, przekazałem mamie: ${out.notify.text.replace(/^\S+ /, '')}. Dam znać, jak odpowie.` + (c.kind === 'pieniadze' ? ' Pamiętaj: bot niczego nie wysyła, mama zapłaci sama.' : ''));
        delete conv[childId];
        return out;
      },
      decide(id, action) {
        const nt = notifs.find(x => x.id === id); if (!nt || nt.decision) return null;
        nt.decision = action;
        const ch = nt.child, D = nt.data;
        const R = {
          zgoda: { pieniadze: `Mama się zgodziła ✅ ${D.amount} zł — ${D.purpose}. Mama sama kupi i przekaże kod (bot nie wysyła pieniędzy ani kodów).`, klucze: `Mama potwierdza ✅ Klucze ${D.where}, ${D.when && D.when.label}.`, odbior: `Mama potwierdza ✅ Odbierze Cię ${D.where}, ${D.when && D.when.label}.`, zakupy: `Mama potwierdza ✅ Kupi: ${D.items}.`, powrot: `Mama potwierdza ✅ Wracasz ${D.when && D.when.label}. Napisz, jak będziesz w domu.`, alarm: 'Zablokowano.' },
          odmowa: { pieniadze: 'Mama tym razem odmówiła ❌ Porozmawiacie wieczorem.', klucze: 'Mama prosi o inne rozwiązanie ❌ Napisz inną propozycję.', odbior: 'Mama nie da rady przyjechać ❌ Wróć autobusem albo poproś tatę.', zakupy: 'Mama nie kupi tego dziś ❌', powrot: 'Mama się nie zgadza ❌ Wróć wcześniej.', alarm: 'Zablokowano.' },
          oddzwonie: 'Mama oddzwoni, jak tylko będzie mogła 📞'
        };
        const reply = action === 'oddzwonie' ? R.oddzwonie : R[action][nt.kind];
        return { child: ch.id, reply };
      }
    };
    function isUrgent(kind, D, t, n) {
      if (/pilne|pilnie|szybko|natychmiast|na teraz|asap/.test(t)) return true;
      if (kind === 'klucze' || kind === 'odbior') return true;
      if (kind === 'pieniadze') return !!(D.deadline && D.deadline.iso === F.iso(n));
      return false;
    }
    function mk(ch, kind, D, urgent, alarmText) {
      const K = KIND[kind] || { icon: '⚠️', title: 'Uwaga' };
      let text;
      if (kind === 'alarm') text = alarmText;
      else if (kind === 'pieniadze') text = `${K.icon} ${ch.name} prosi o ${D.amount} zł — ${D.purpose}, ${D.deadline.label}`;
      else if (kind === 'klucze') text = `${K.icon} ${ch.name}: klucze ${D.where}, ${D.when.label}`;
      else if (kind === 'odbior') text = `${K.icon} ${ch.name} prosi o odbiór ${/^(z|ze|spod|sprzed) /.test(D.where) ? D.where : '— ' + D.where}, ${D.when.label}`;
      else if (kind === 'zakupy') text = `${K.icon} ${ch.name}: trzeba kupić ${D.items}${D.when ? ', ' + D.when.label : ''}`;
      else if (kind === 'powrot') text = `${K.icon} ${ch.name} wróci ${D.when.label}${D.why ? ' (' + D.why + ')' : ''}`;
      const nt = { id: 'n' + (++seq), child: ch, kind, data: JSON.parse(JSON.stringify(D)), urgent: !!urgent, text, at: now().getTime(), decision: null };
      notifs.push(nt); return nt;
    }
    return S;
  }
  return { CHILDREN, KIND, createFamily, detect };
});
