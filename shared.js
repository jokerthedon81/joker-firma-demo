/* JOKERAl — wspólne v2: konfiguracja, marka, ikony, mowa, toast, fajerwerki, pokaz, bilet PNG/PDF */
(function () {
  const J = window.JK = {};
  /* ======= KONFIGURACJA — zmień tutaj dane kontaktowe do „Umów pokaz” ======= */
  J.CONFIG = {
    CONTACT_EMAIL: 'kontakt@example.com',   // ← wpisz swój e-mail
    CONTACT_TEL: '+48000000000',            // ← wpisz swój numer
    PRICE_LABEL: 'od X zł/mies.'            // ← przykładowa cena (placeholder)
  };
  J.$ = id => document.getElementById(id);
  J.rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  J.esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  J.brand = t => J.esc(t).replace(/JOKERAl/g, 'JOKERA<span class="l">l</span>');
  J.sleep = ms => new Promise(r => setTimeout(r, ms));
  /* ikony (własne, proste ścieżki SVG) */
  const P = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    send: '<path d="M4 12l16-8-6 16-2-7z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    dl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    phone: '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2s1 1.7 3 2 3 .9 3 2-1.2 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    qr: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/>',
    camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    csv: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="8" r="2.5"/><path d="M17 13c3 0 5 2 5 5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-3 2 3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
  };
  J.icon = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  /* ilustracja palety (izometria, generowana) */
  const PAL = { epal: { w: 12, d: 8, n: 5 }, przem: { w: 12, d: 10, n: 6 }, jedn: { w: 12, d: 8, n: 4, thin: true }, pol: { w: 8, d: 6, n: 4 } };
  J.pallet = (kind, size) => {
    const c = PAL[kind] || PAL.epal, S = 6.2, ox = 74, oy = 30;
    const pr = (x, y, z) => (ox + (x - y) * 0.866 * S).toFixed(1) + ',' + (oy + (x + y) * 0.5 * S - z * S).toFixed(1);
    const st = 'stroke="#d9c9a3" stroke-width=".7" stroke-linejoin="round"';
    const box = (x, y, z, w, d, h) => `<polygon points="${pr(x, y + d, z)} ${pr(x + w, y + d, z)} ${pr(x + w, y + d, z + h)} ${pr(x, y + d, z + h)}" fill="#121215" ${st}/><polygon points="${pr(x + w, y, z)} ${pr(x + w, y + d, z)} ${pr(x + w, y + d, z + h)} ${pr(x + w, y, z + h)}" fill="#0d0d10" ${st}/><polygon points="${pr(x, y, z + h)} ${pr(x + w, y, z + h)} ${pr(x + w, y + d, z + h)} ${pr(x, y + d, z + h)}" fill="#1b1a1e" ${st}/>`;
    const W = c.w, D = c.d, bh = c.thin ? .9 : 1.25, sl = c.thin ? .35 : .5, g = [];
    const bx = [0, W / 2 - .7, W - 1.4], by = [0, D / 2 - .7, D - 1.4];
    by.forEach(y => g.push(box(0, y, 0, W, 1.4, sl)));
    const bl = []; bx.forEach(x => by.forEach(y => bl.push([x, y]))); bl.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    bl.forEach(([x, y]) => g.push(box(x, y, sl, 1.4, 1.4, bh)));
    by.forEach(y => g.push(box(0, y, sl + bh, W, 1.4, sl)));
    const sw = W / c.n; for (let i = 0; i < c.n; i++) g.push(box(i * sw + .15, 0, sl * 2 + bh, sw - .45, D, sl));
    return `<svg viewBox="0 0 150 104" width="${size || 96}" role="img" aria-label="Rysunek palety"><ellipse cx="74" cy="${oy + (W + D) * 1.55 + 18}" rx="${(W + D) * 2.8}" ry="5" fill="rgba(217,201,163,.08)"/>${g.join('')}</svg>`;
  };
  /* chronograf odliczania (rezerwacja 30 min) */
  J.chrono = (total) => {
    const el = document.createElement('div'); el.className = 'chrono';
    let t = ''; for (let i = 0; i < 60; i++) { const a = i * 6, L = i % 10 === 0 ? 7 : i % 2 === 0 ? 4 : 2.2; t += `<line x1="50" y1="${4.5}" x2="50" y2="${4.5 + L}" transform="rotate(${a} 50 50)" stroke="${i % 10 === 0 ? '#f4ecd8' : '#8b8b94'}" stroke-width="${i % 10 === 0 ? .9 : .45}"/>`; }
    const R = ['XXX', 'V', 'X', 'XV', 'XX', 'XXV']; let nums = '';
    R.forEach((r, i) => { const a = (i * 60 - 90) * Math.PI / 180; nums += `<text x="${(50 + 33 * Math.cos(a)).toFixed(1)}" y="${(50 + 33 * Math.sin(a) + 2.3).toFixed(1)}" text-anchor="middle" font-family="Cormorant Garamond,Georgia,serif" font-size="${i ? 6.2 : 6.6}" fill="#cfc4a8">${r}</text>`; });
    el.innerHTML = `<svg viewBox="0 0 100 100" role="img" aria-label="Czas rezerwacji"><defs><radialGradient id="dg" cx=".5" cy=".4"><stop offset="0" stop-color="#1c1c21"/><stop offset="1" stop-color="#0a0a0c"/></radialGradient></defs>
      <circle cx="50" cy="50" r="49" fill="url(#dg)" stroke="#d9c9a3" stroke-width=".5"/><circle cx="50" cy="50" r="46.6" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".4"/>
      <circle class="arc" cx="50" cy="50" r="41" fill="none" stroke="#d9c9a3" stroke-width=".9" stroke-dasharray="257.6" stroke-dashoffset="0" transform="rotate(-90 50 50)" opacity=".55"/>
      ${t}${nums}<text x="50" y="66" text-anchor="middle" font-size="3.6" letter-spacing=".9" fill="#7a7a85" font-family="-apple-system,Inter,sans-serif">REZERWACJA</text>
      <g class="hm"><path d="M50 50 L50 22" stroke="#f4ecd8" stroke-width="1.6" stroke-linecap="round"/></g>
      <g class="hs"><path d="M50 58 L50 9" stroke="#b79cff" stroke-width=".45" stroke-linecap="round"/><circle cx="50" cy="12" r="1" fill="#b79cff"/></g>
      <circle cx="50" cy="50" r="2.1" fill="#d9c9a3"/><circle cx="50" cy="50" r=".8" fill="#0a0a0c"/></svg><div class="dig num"></div>`;
    const hm = el.querySelector('.hm'), hs = el.querySelector('.hs'), arc = el.querySelector('.arc'), dig = el.querySelector('.dig');
    let lastS = null, sweeps = 0;
    el.update = left => {
      left = Math.max(0, left); const s = Math.ceil(left / 1000);
      dig.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      hm.style.transform = `rotate(${((left / total) * 360).toFixed(2)}deg)`;
      const sec = s % 60; if (lastS !== null && sec > lastS) sweeps++; lastS = sec;
      hs.style.transform = `rotate(${((60 - sec) * 6 + sweeps * 360).toFixed(1)}deg)`;
      arc.style.strokeDashoffset = (257.6 * (1 - left / total)).toFixed(1);
      el.classList.toggle('low', s < 300);
    };
    return el;
  };
  /* toast */
  J.toast = (t, type) => {
    let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    type = type || 'info'; el.className = 'toast ' + type;
    el.innerHTML = `<span class="ti">${type === 'ok' ? '✓' : type === 'err' ? '!' : 'i'}</span><span>${J.brand(t)}</span>`;
    requestAnimationFrame(() => el.classList.add('on')); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), type === 'err' ? 4200 : 2800);
  };
  /* mowa */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() { if (!synth) return; const all = synth.getVoices(), pl = all.filter(v => /^pl/i.test(v.lang)); voice = pl.find(v => /google/i.test(v.name)) || pl.find(v => /zosia|ewa|paulina|marek|natural|online|enhanced|premium/i.test(v.name)) || pl[0] || null; }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  let soundOn = false; try { soundOn = localStorage.getItem('jk.sound') === 'on'; } catch (e) { }
  J.voice = { canListen: !!SR, canSpeak: !!synth, get muted() { return !soundOn; }, set muted(v) { soundOn = !v; try { localStorage.setItem('jk.sound', soundOn ? 'on' : 'off'); } catch (e) { } if (v) J.stopSpeak(); } };
  J.toSpeech = t => String(t).replace(/JOKERAl/g, 'Dżoker A l').replace(/×/g, ' razy ').replace(/(\d+),00 zł/g, '$1 złotych').replace(/(\d+),(\d\d) zł/g, '$1 złotych $2 groszy').replace(/\bszt\./g, 'sztuk').replace(/EPAL/g, 'e pal').replace(/[„”]/g, '').replace(/—/g, ',').replace(/\p{Extended_Pictographic}/gu, '');
  J.speak = (text, done) => {
    if (!synth || !soundOn) { done && done(); return; }
    try { synth.cancel(); } catch (e) { }
    const u = new SpeechSynthesisUtterance(J.toSpeech(text)); u.lang = 'pl-PL'; if (voice) u.voice = voice; u.rate = 1.03;
    let f = false; const fin = () => { if (f) return; f = true; clearTimeout(g); done && done(); };
    u.onend = fin; u.onerror = fin; const g = setTimeout(fin, 2500 + text.length * 90); synth.speak(u);
  };
  J.stopSpeak = () => { try { synth && synth.cancel(); } catch (e) { } };
  J.listen = h => {
    if (!SR) { h.onError && h.onError('Ta przeglądarka nie rozpoznaje mowy. Napisz wiadomość albo stuknij gotową odpowiedź. Na iPhonie użyj Safari, na Androidzie Chrome.'); return null; }
    J.stopSpeak();
    const rec = new SR(); rec.lang = 'pl-PL'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let fin = '';
    rec.onresult = e => { let im = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else im += r[0].transcript; } h.onInterim && h.onInterim((fin + ' ' + im).trim()); };
    rec.onerror = e => { const m = { 'not-allowed': 'Brak dostępu do mikrofonu. Zezwól na mikrofon (iPhone: Ustawienia → Safari → Mikrofon) albo po prostu pisz.', 'service-not-allowed': 'Rozpoznawanie mowy jest wyłączone w tej przeglądarce. Pisz albo stuknij gotową odpowiedź.', 'network': 'Rozpoznawanie mowy potrzebuje internetu. Spróbuj jeszcze raz.', 'no-speech': 'Nic nie usłyszałem. Stuknij mikrofon i powiedz np. „10 palet euro na jutro na 9”.', 'audio-capture': 'Nie widzę mikrofonu w tym urządzeniu. Pisz w polu obok.' }[e.error]; if (m) h.onError && h.onError(m); };
    rec.onend = () => { h.onState && h.onState(false); h.onFinal && h.onFinal(fin.trim()); };
    try { rec.start(); h.onState && h.onState(true); } catch (e) { h.onState && h.onState(false); }
    return rec;
  };
  /* błysk światła (zamiast fajerwerków) */
  J.sheen = el => { if (!el || J.rm) return; el.classList.add('sheen'); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); };
  J.reveal = () => { const els = document.querySelectorAll('.reveal:not(.in)'); if (!('IntersectionObserver' in window) || J.rm) { els.forEach(e => e.classList.add('in')); return; } const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }); els.forEach(e => io.observe(e)); };
  /* nagłówek i stopka */
  J.nav = on => {
    const L = [['index.html', 'Start'], ['zamowienie.html', 'Zamów'], ['odbior.html', 'Paczkomat'], ['panel.html', 'Panel firmy'], ['rodzina.html', 'Rodzina'], ['index.html#dla-firm', 'Dla firm']];
    return `<header class="top"><div class="wrap"><a class="logo" href="index.html" title="Strona główna"><span class="mono" aria-hidden="true">J</span><span><span class="wm">JOKERA<span class="l">l</span></span><span class="sub">Firma</span></span></a><span class="demo-badge" title="Wersja demonstracyjna — płatności testowe, dane przykładowe">Tryb demo</span><nav class="navlinks" aria-label="Menu">${L.map(([h, t]) => `<a href="${h}"${h === on ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav></div></header>`;
  };
  J.foot = () => `<footer class="foot"><div class="wrap"><span class="mono" aria-hidden="true">J</span><p>Follow the Rabbit, by <b>JOKERA<span class="l">l</span></b></p><p>Wersja demonstracyjna. Działa w całości w przeglądarce, na regułach, bez płatnych usług AI. Płatności są testowe — żadne pieniądze nie są pobierane. Dane i ceny są przykładowe.</p></div></footer>`;
  J.mount = on => { const n = J.$('navw'), f = J.$('footw'); if (n) n.outerHTML = J.nav(on); if (f) f.outerHTML = J.foot(); };
  /* czat: wskaźnik pisania */
  J.typing = (chat, ms) => new Promise(r => { const t = document.createElement('div'); t.className = 'typing'; t.setAttribute('role', 'status'); t.innerHTML = '<i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i><span class="sr">Asystent pisze…</span>'; chat.appendChild(t); chat.scrollTop = chat.scrollHeight; setTimeout(() => { t.remove(); r(); }, J.rm ? 80 : (ms || 650)); });
  /* ======= Pokaz automatyczny ======= */
  const PK = 'jk.pokaz';
  J.pokaz = {
    TOTAL: 7,
    get on() { try { return sessionStorage.getItem(PK) === '1'; } catch (e) { return false; } },
    start() { try { sessionStorage.setItem(PK, '1'); } catch (e) { } location.href = 'zamowienie.html?pokaz=1'; },
    stop(silent) { try { sessionStorage.removeItem(PK); } catch (e) { } const b = document.querySelector('.pokaz-bar'); if (b) b.remove(); document.querySelectorAll('.pokaz-hl').forEach(e => e.classList.remove('pokaz-hl')); if (!silent) J.toast('Pokaz zatrzymany. Możesz klikać sam.', 'info'); },
    step(n, title, text) {
      let b = document.querySelector('.pokaz-bar');
      if (!b) { b = document.createElement('div'); b.className = 'pokaz-bar'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); b.innerHTML = '<span class="pn"></span><span class="pt"></span><button class="icon-btn" aria-label="Zatrzymaj pokaz">' + J.icon('stop') + '</button><span class="pp"><i></i></span>'; document.body.appendChild(b); b.querySelector('button').onclick = () => J.pokaz.stop(); }
      b.querySelector('.pn').textContent = n; b.querySelector('.pt').innerHTML = `<small>Pokaz automatyczny · krok ${n}/${J.pokaz.TOTAL}</small>${J.brand(text || title)}`;
      b.querySelector('.pp i').style.width = (100 * n / J.pokaz.TOTAL) + '%';
    },
    hl(el) { document.querySelectorAll('.pokaz-hl').forEach(e => e.classList.remove('pokaz-hl')); if (el) { el.classList.add('pokaz-hl'); el.scrollIntoView({ block: 'center', behavior: J.rm ? 'auto' : 'smooth' }); } },
    async wait(ms) { await J.sleep(ms); if (!J.pokaz.on) throw new Error('stop'); },
    async type(input, text) { input.focus({ preventScroll: true }); input.value = ''; for (const ch of text) { input.value += ch; input.dispatchEvent(new Event('input')); await J.pokaz.wait(J.rm ? 5 : 38); } }
  };
  /* ======= bilet: PNG + PDF ======= */
  J.ticketCanvas = (o, qrMatrix, extra) => {
    const Wd = 720, Ht = 1240, c = document.createElement('canvas'); c.width = Wd; c.height = Ht; const x = c.getContext('2d');
    const SER = '"Cormorant Garamond", Georgia, serif', SAN = '-apple-system, "SF Pro Text", Inter, Arial, sans-serif';
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    x.fillStyle = '#050506'; x.fillRect(0, 0, Wd, Ht);
    rr(28, 28, Wd - 56, Ht - 56, 34); x.fillStyle = '#0e0e11'; x.fill(); x.strokeStyle = 'rgba(217,201,163,.45)'; x.lineWidth = 1.5; x.stroke();
    // nagłówek z giloszem
    x.save(); rr(28, 28, Wd - 56, 330, 34); x.clip();
    const g = x.createLinearGradient(0, 28, 0, 358); g.addColorStop(0, '#17161a'); g.addColorStop(1, '#0e0e11'); x.fillStyle = g; x.fillRect(28, 28, Wd, 340);
    x.strokeStyle = 'rgba(217,201,163,.13)'; x.lineWidth = .8;
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.beginPath(); x.arc(Wd - 120 + 40 * Math.cos(a), 150 + 40 * Math.sin(a), 150, 0, 7); x.stroke(); }
    x.restore();
    // pasek
    x.save(); x.translate(70, 92); x.transform(1, 0, -0.7, 1, 0, 0); [['#e4e5e9', 0], ['#8b5cf6', 26], ['#d9c9a3', 52]].forEach(([col, dx]) => { x.fillStyle = col; x.fillRect(dx, 0, 24, 4); }); x.restore();
    x.fillStyle = '#a8956a'; x.font = `600 17px ${SAN}`; x.fillText('B I L E T   O D B I O R U', 70, 140);
    x.fillStyle = '#f5f5f7'; x.font = `200 70px ${SAN}`; x.fillText(o.no, 66, 225);
    x.fillStyle = '#c9c9cf'; x.font = `400 26px ${SAN}`; x.fillText(o.qty + ' × ' + o.name, 70, 272);
    x.fillStyle = '#d9c9a3'; x.font = `600 22px ${SAN}`; x.fillText('JOKERA', 70, 320); const w1 = x.measureText('JOKERA').width; x.font = `italic 600 28px ${SER}`; x.fillText('l', 72 + w1, 320);
    // perforacja
    x.fillStyle = '#050506'; x.beginPath(); x.arc(28, 380, 20, 0, 7); x.arc(Wd - 28, 380, 20, 0, 7); x.fill();
    x.strokeStyle = 'rgba(217,201,163,.35)'; x.setLineDash([2, 8]); x.lineWidth = 2; x.beginPath(); x.moveTo(60, 380); x.lineTo(Wd - 60, 380); x.stroke(); x.setLineDash([]);
    const F = [['DATA', extra.date], ['OKNO ODBIORU', extra.window], ['RAMPA', '2'], ['SKRYTKA', String(o.locker)]];
    F.forEach(([k, v], i) => { const cx = 70 + (i % 2) * 310, cy = 438 + Math.floor(i / 2) * 96; x.font = `600 15px ${SAN}`; x.fillStyle = '#a8956a'; x.fillText(k.split('').join(String.fromCharCode(8202)), cx, cy); x.font = `300 34px ${SAN}`; x.fillStyle = '#f5f5f7'; x.fillText(v, cx, cy + 42); });
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1; x.beginPath(); x.moveTo(70, 645); x.lineTo(Wd - 70, 645); x.stroke();
    const n = qrMatrix.length, qs = 360, cell = Math.floor(qs / (n + 8)), qw = cell * (n + 8), qx = (Wd - qw) / 2, qy = 680;
    rr(qx, qy, qw, qw, 20); x.fillStyle = '#f7f3ea'; x.fill(); x.fillStyle = '#0b0b0f';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qrMatrix[r][k]) x.fillRect(qx + (k + 4) * cell, qy + (r + 4) * cell, cell, cell);
    x.textAlign = 'center'; x.font = `200 56px ${SAN}`; x.fillStyle = '#f4ecd8'; x.fillText(o.code.replace(/(\d{3})(\d{3})/, '$1 $2'), Wd / 2, qy + qw + 74);
    x.font = `400 19px ${SAN}`; x.fillStyle = '#a1a1aa'; x.fillText('Zeskanuj w Paczkomacie Joker · rampa 2', Wd / 2, qy + qw + 110);
    x.font = `600 14px ${SAN}`; x.fillStyle = '#f1c766'; x.fillText('TRYB DEMO · PŁATNOŚĆ TESTOWA', Wd / 2, Ht - 58);
    return c;
  };
  J.download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  J.pdfFromCanvas = c => {
    const bin = atob(c.toDataURL('image/jpeg', .92).split(',')[1]); const img = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);
    const pw = 360, ph = Math.round(360 * c.height / c.width), enc = s => new TextEncoder().encode(s);
    const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    const objs = [enc('<< /Type /Catalog /Pages 2 0 R >>'), enc('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'), enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
      [enc(`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`), img, enc('\nendstream')], enc(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)];
    const parts = [enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')]; let off = parts[0].length; const xref = [];
    objs.forEach((o, i) => { xref.push(off); const head = enc(`${i + 1} 0 obj\n`), tail = enc('\nendobj\n'); const arr = Array.isArray(o) ? o : [o]; [head, ...arr, tail].forEach(p => { parts.push(p); off += p.length; }); });
    const xs = off; parts.push(enc(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + xref.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xs}\n%%EOF`));
    return new Blob(parts, { type: 'application/pdf' });
  };
  /* PWA: nic do instalowania — manifest + ikona wystarczą, żeby dodać do ekranu głównego */
})();
