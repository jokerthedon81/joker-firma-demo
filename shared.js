/* JOKERAl — wspólne: marka, mowa (Web Speech API), toast, fajerwerki */
(function () {
  const J = window.JK = {};
  J.$ = id => document.getElementById(id);
  J.esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  J.brand = t => J.esc(t).replace(/JOKERAl/g, 'JOKERA<span class="l">l</span>');
  J.toast = (t, ms) => { let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); } el.innerHTML = J.brand(t); el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), ms || 2600); };
  /* mowa */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() { if (!synth) return; const all = synth.getVoices(), pl = all.filter(v => /^pl/i.test(v.lang)); voice = pl.find(v => /google/i.test(v.name)) || pl.find(v => /zosia|ewa|paulina|marek|natural|online/i.test(v.name)) || pl[0] || null; }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  J.voice = { canListen: !!SR, canSpeak: !!synth, muted: false };
  J.toSpeech = t => String(t).replace(/JOKERAl/g, 'Dżoker A l').replace(/×/g, ' razy ').replace(/(\d+),00 zł/g, '$1 złotych').replace(/(\d+),(\d\d) zł/g, '$1 złotych $2 groszy').replace(/\bszt\./g, 'sztuk').replace(/EPAL/g, 'e pal').replace(/„|”/g, '').replace(/—/g, ',').replace(/[✅🔑🏠🚗🛒💸⚠️📦]/g, '');
  J.speak = (text, done) => {
    if (!synth || J.voice.muted) { done && done(); return; }
    try { synth.cancel(); } catch (e) { }
    const u = new SpeechSynthesisUtterance(J.toSpeech(text)); u.lang = 'pl-PL'; if (voice) u.voice = voice; u.rate = 1.03; u.pitch = 1;
    let f = false; const fin = () => { if (f) return; f = true; clearTimeout(g); done && done(); };
    u.onend = fin; u.onerror = fin; const g = setTimeout(fin, 2500 + text.length * 90); synth.speak(u);
  };
  J.stopSpeak = () => { try { synth && synth.cancel(); } catch (e) { } };
  /* rozpoznawanie: onInterim(text), onFinal(text), onState(bool), onError(msg) */
  J.listen = (h) => {
    if (!SR) { h.onError && h.onError('Ta przeglądarka nie rozpoznaje mowy (np. Firefox). Napisz wiadomość w polu obok.'); return null; }
    J.stopSpeak();
    const rec = new SR(); rec.lang = 'pl-PL'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let fin = '';
    rec.onresult = e => { let im = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else im += r[0].transcript; } h.onInterim && h.onInterim((fin + ' ' + im).trim()); };
    rec.onerror = e => { const m = { 'not-allowed': 'Brak dostępu do mikrofonu. Zezwól na mikrofon w ustawieniach przeglądarki (na iPhonie: Ustawienia → Safari → Mikrofon) albo pisz.', 'service-not-allowed': 'Rozpoznawanie mowy jest zablokowane w tej przeglądarce. Pisz w polu obok.', 'network': 'Rozpoznawanie mowy potrzebuje internetu. Spróbuj ponownie.', 'no-speech': 'Nic nie słyszę — stuknij mikrofon i mów.' }[e.error]; if (m) h.onError && h.onError(m); };
    rec.onend = () => { h.onState && h.onState(false); const t = fin.trim(); if (t) h.onFinal && h.onFinal(t); else h.onFinal && h.onFinal(''); };
    try { rec.start(); h.onState && h.onState(true); } catch (e) { h.onState && h.onState(false); }
    return rec;
  };
  /* fajerwerki / konfetti na canvasie */
  J.fireworks = (canvas, opts) => {
    opts = opts || {};
    const c = canvas, x = c.getContext('2d'); let W, H, parts = [], rockets = [], run = true, dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); window.addEventListener('resize', size);
    const COL = ['#c084fc', '#8b5cf6', '#e9d5ff', '#ffffff', '#d9dce3', '#a78bfa', '#f0abfc'];
    function burst(px, py, n) { const col = COL[Math.floor(Math.random() * COL.length)]; for (let i = 0; i < (n || 70); i++) { const a = Math.random() * Math.PI * 2, s = Math.random() * 4 + 1.2; parts.push({ x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: Math.random() < .3 ? '#fff' : col, r: Math.random() * 2 + .8 }); } }
    function launch() { rockets.push({ x: W * (.15 + Math.random() * .7), y: H, vy: -(H / 70 + Math.random() * 3), tx: H * (.15 + Math.random() * .35) }); }
    let last = 0;
    function frame(t) {
      if (!run) return;
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'lighter';
      if (!opts.once && t - last > (opts.every || 900)) { last = t; launch(); }
      rockets = rockets.filter(r => { r.y += r.vy; r.vy *= .985; x.fillStyle = '#e9d5ff'; x.beginPath(); x.arc(r.x, r.y, 2, 0, 7); x.fill(); if (r.y <= r.tx || r.vy > -1) { burst(r.x, r.y); return false; } return true; });
      parts = parts.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += .045; p.vx *= .985; p.life -= .012; x.globalAlpha = Math.max(0, p.life); x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); return p.life > 0; });
      x.globalAlpha = 1; requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { burst: (px, py, n) => burst(px == null ? W / 2 : px, py == null ? H / 3 : py, n), stop: () => { run = false; }, launch };
  };
  J.nav = (on) => {
    const L = [['index.html', 'Start'], ['zamowienie.html', 'Zamów'], ['odbior.html', 'Paczkomat'], ['panel.html', 'Panel firmy'], ['rodzina.html', 'Rodzina']];
    return '<nav class="top"><a class="logo" href="index.html"><span class="mask"></span><b>JOKERA<span class="l">l</span></b><em>Firma</em></a><div class="navlinks">' + L.map(([h, t]) => `<a href="${h}"${h === on ? ' class="on"' : ''}>${t}</a>`).join('') + '</div></nav>';
  };
  J.foot = () => '<footer class="foot"><div class="sig">Follow the Rabbit, by <b>JOKERA<span class="l">l</span></b></div><div>Wersja demonstracyjna. Działa w całości w przeglądarce, na regułach, bez płatnych usług AI. Płatności są testowe — żadne pieniądze nie są pobierane.</div></footer>';
})();
