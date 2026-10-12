import sys, os, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
SHOTS = len(sys.argv) <= 2 or sys.argv[2] != 'noshots'
SH = '/workspace/joker-firma/shots/'
errs = []
def ok(c, m):
    print(('  ✓ ' if c else '  ✗ ') + m, flush=True)
    if not c: errs.append(m)
def shot(pg, name, full=False):
    if SHOTS: pg.screenshot(path=SH + 'v2-' + name + '.png', full_page=full)
def overflow(pg, name):
    ov = pg.evaluate("""() => { const W = innerWidth; let bad = [];
      document.querySelectorAll('body *').forEach(e => { if (e.closest('.tblw,.offer,.chips,nav,.kids,#sky,.endm')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1 && getComputedStyle(e).position !== 'fixed') bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.right)); });
      return [document.documentElement.scrollWidth - W, bad.slice(0, 5)]; }""")
    ok(ov[0] <= 0, f'{name}: brak poziomego przewijania {ov}')
def chat_has(pg, sel, txt, t=6000):
    try: pg.wait_for_function("([s,t]) => document.querySelector(s) && document.querySelector(s).innerText.toLowerCase().includes(t.toLowerCase())", arg=[sel, txt], timeout=t); return True
    except Exception: return False
def run(mobile):
    tag = 'mobile' if mobile else 'desktop'
    print('==', tag, BASE, flush=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', args=['--use-fake-ui-for-media-stream'])
        vp = {'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}
        ctx = b.new_context(viewport=vp, device_scale_factor=3 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale='pl-PL', timezone_id='Europe/Warsaw', accept_downloads=True)
        pg = ctx.new_page(); cons = []
        pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: cons.append(str(e)))
        bad = []
        pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        # --- landing
        pg.goto(BASE + 'index.html'); pg.evaluate("localStorage.clear(); sessionStorage.clear()"); pg.reload(); pg.wait_for_timeout(2500)
        ok('Klient zamawia' in pg.inner_text('h1'), 'landing: nagłówek')
        ok(pg.locator('#flow .step').count() == 7, 'landing: 7 kroków')
        ok('mailto:' in (pg.get_attribute('#mail', 'href') or '') and 'tel:' in (pg.get_attribute('#tel', 'href') or ''), 'Dla firm: CTA mailto/tel z CONFIG')
        ok('zł' in pg.inner_text('#roiZl'), 'ROI liczy: ' + pg.inner_text('#roiZl'))
        ok('przykład' in pg.inner_text('#dla-firm').lower(), 'ROI/cena oznaczone jako przykładowe')
        ok(pg.evaluate("document.fonts.check('500 40px \"Cormorant Garamond\"')"), 'font szeryfowy załadowany lokalnie')
        txt = pg.evaluate("document.documentElement.outerHTML")
        for w in ['Rolls', 'BMW', 'Patek', 'Spirit of Ecstasy', 'JOKERAI', 'JOKER AI']:
            ok(w not in txt, f'brak „{w}” w kodzie strony')
        shot(pg, f'landing-{tag}'); overflow(pg, 'landing')
        pg.evaluate("document.getElementById('dla-firm').scrollIntoView()"); pg.wait_for_timeout(1500); shot(pg, f'dla-firm-{tag}')
        pg.evaluate("window.scrollTo(0,0)")
        # --- zamówienie: rezerwacja, chrono, stepper, cofnij
        pg.goto(BASE + 'zamowienie.html'); pg.wait_for_timeout(900)
        ok(pg.locator('#chips .chip').count() >= 3, 'szybkie odpowiedzi widoczne')
        ok(pg.get_attribute('#muteBtn', 'aria-pressed') in ('false', None) or 'Włącz' in (pg.get_attribute('#muteBtn', 'aria-label') or ''), 'dźwięk domyślnie wyłączony: ' + str(pg.get_attribute('#muteBtn', 'aria-label')))
        pg.locator('#chips .chip', has_text='Godziny otwarcia').click(); ok(chat_has(pg, '#chat', '22:00'), 'chip: godziny otwarcia')
        pg.fill('#inp', 'potrzebuję 10 palet euro na jutro na 9:00'); pg.press('#inp', 'Enter')
        pg.wait_for_selector('.oc[data-status="rezerwacja"] .chrono', timeout=8000)
        card = pg.locator('.oc[data-status="rezerwacja"]').last
        ok(chat_has(pg, '#chat', 'Tak, nie ma problemu'), 'bot: „Tak, nie ma problemu”')
        ok('09:00–10:00' in card.inner_text(), 'okno odbioru 09:00–10:00')
        pg.wait_for_timeout(1500)
        ok(pg.evaluate("(() => { const h = document.querySelector('.oc .hs'); return h && getComputedStyle(h).transform !== 'none'; })()"), 'chronograf: wskazówka sekundowa ustawiona')
        card.locator('.stepper button[data-d="1"]').click(); pg.wait_for_timeout(300)
        ok(card.locator('.stepper output').inner_text().strip() == '11', 'stepper +1 → 11')
        ok('495' in card.inner_text(), 'suma 11 × 45 = 495 zł')
        pg.locator('.si[data-p="epal"] .n').wait_for()
        ok(pg.locator('.si[data-p="epal"] .n').inner_text().startswith('109'), 'stan EPAL 109 w widżecie: ' + pg.locator('.si[data-p="epal"] .n').inner_text())
        pg.fill('#inp', 'jednak 10'); pg.press('#inp', 'Enter'); pg.wait_for_timeout(1200)
        ok(card.locator('.stepper output').inner_text().strip() == '10', 'zmiana ilości w czacie „jednak 10”')
        ok(pg.locator('#steps li.cur').count() == 1, 'pasek kroków aktywny')
        shot(pg, f'order-reservation-{tag}')
        card.locator('.pay').first.click(); ok(chat_has(pg, 'body', 'Kod BLIK ma 6 cyfr'), 'błąd BLIK przyjazny')
        card.locator('.blik input').fill('777123'); card.locator('.pm-blik .pay').click()
        pg.wait_for_selector('.oc.ticket .t-qr img', timeout=8000); pg.wait_for_timeout(1200)
        t = pg.locator('.oc.ticket').last
        no = t.locator('.t-no').inner_text().strip(); code = t.locator('.t-code').inner_text().replace(' ', '')
        ok(no.startswith('JK') or len(no) > 4, 'bilet: numer ' + no); ok(len(code) == 6, 'bilet: kod ' + code)
        ok('rampa' in t.inner_text().lower() and 'okno odbioru' in t.inner_text().lower(), 'bilet: rampa i okno')
        t.scroll_into_view_if_needed(); pg.wait_for_timeout(400); shot(pg, f'order-ticket-{tag}')
        with pg.expect_download() as d: t.locator('.wpng').click()
        fn = '/tmp/' + d.value.suggested_filename; d.value.save_as(fn); ok(fn.endswith('.png') and open(fn, 'rb').read(4) == b'\x89PNG', 'pobrano PNG biletu')
        with pg.expect_download() as d: t.locator('.wpdf').click()
        fn2 = '/tmp/' + d.value.suggested_filename; d.value.save_as(fn2); ok(open(fn2, 'rb').read(5) == b'%PDF-', 'pobrano PDF biletu')
        if SHOTS: os.system(f'cp {fn} {SH}v2-ticket-file-{tag}.png')
        qsrc = t.locator('.t-qr img').get_attribute('src')
        # --- odbiór: dekodowanie QR, otwarcie skrytki, ponowne użycie
        pg.goto(BASE + 'odbior.html'); pg.wait_for_timeout(700)
        dec = pg.evaluate("""async src => { await window.__loadQR(); const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width * 4; c.height = im.height * 4; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height); const r = jsQR(d.data, c.width, c.height); return r && r.data; }""", qsrc)
        ok(bool(dec) and 'odbior.html#' in dec and ('k=' + code) in dec, 'QR dekoduje się do linku odbioru')
        pg.fill('#code', code); pg.press('#code', 'Enter')
        pg.wait_for_selector('.locker.open', timeout=5000); pg.wait_for_timeout(1700)
        ok('otwarta' in pg.inner_text('#msg'), 'skrytka otwarta'); ok(pg.locator('#rampa.open').count() == 1, 'rampa otwarta')
        pg.locator('.locker.open').scroll_into_view_if_needed(); shot(pg, f'locker-open-{tag}')
        pg.click('#closeBtn'); pg.fill('#code', code); pg.press('#code', 'Enter'); pg.wait_for_timeout(1300)
        ok('wydane' in pg.inner_text('#msg').lower() or 'już' in pg.inner_text('#msg').lower(), 'ponowne użycie kodu odrzucone: ' + pg.inner_text('#msg')[:80].replace('\n', ' '))
        pg.fill('#code', '000000'); pg.press('#code', 'Enter'); pg.wait_for_timeout(1300)
        ok('Nie znam tego kodu' in pg.inner_text('#msg'), 'zły kod: przyjazny komunikat')
        overflow(pg, 'odbiór')
        # --- poza stanem + duże zamówienie
        pg.goto(BASE + 'zamowienie.html'); pg.wait_for_timeout(700)
        pg.fill('#inp', '80 palet przemysłowych jutro 10:00'); pg.press('#inp', 'Enter')
        ok(chat_has(pg, '#chat', 'mam na stanie tylko'), 'brak towaru: propozycja')
        ch = pg.locator('#chips .chip', has_text='termin z dostawą')
        if ch.count(): ch.click(); pg.wait_for_selector('.oc[data-status="rezerwacja"]', timeout=6000); ok(True, 'termin z dostawą → rezerwacja')
        else: ok(False, 'brak chipa „termin z dostawą”')
        c2 = pg.locator('.oc[data-status="rezerwacja"]').last; c2.locator('.warp').click(); pg.wait_for_timeout(1200)
        ok(pg.locator('.oc[data-status="wygasła"]').count() >= 1 and chat_has(pg, '#chat', 'wygasła'), 'symulacja wygaśnięcia')
        pg.fill('#inp', '150 palet jednorazowych jutro 8:00'); pg.press('#inp', 'Enter')
        pg.wait_for_selector('.oc[data-status="akceptacja"]', timeout=6000); ok(True, 'duże zamówienie → do akceptacji')
        p2 = ctx.new_page(); p2.goto(BASE + 'panel.html'); p2.wait_for_timeout(1200)
        p2.locator('button[data-acc]').first.click(); p2.wait_for_timeout(600)
        pg.bring_to_front(); pg.wait_for_selector('.oc[data-status="rezerwacja"]', timeout=6000)
        ok(chat_has(pg, '#chat', 'zostało zatwierdzone'), 'akceptacja w panelu → płatność w czacie')
        c3 = pg.locator('.oc[data-status="rezerwacja"]').last; c3.locator('.seg button[data-m="card"]').click(); c3.locator('.pm-card .pay').click()
        pg.wait_for_selector('.oc.ticket', timeout=8000); ok(True, 'płatność kartą testową → bilet')
        overflow(pg, 'zamówienie')
        # --- panel
        p2.bring_to_front(); p2.reload(); p2.wait_for_timeout(1500)
        k = p2.inner_text('#kpis'); ok('Wydane' in k or 'WYDANE' in k.upper(), 'panel KPI')
        ok(p2.locator('#gauges svg').count() == 4, 'panel: 4 obrotomierze'); ok(p2.locator('#chart rect').count() >= 3, 'panel: wykres godzinowy')
        av = p2.locator('#stock tr[data-p="epal"] .av').inner_text(); ok(av.strip() == '110', 'EPAL dostępne po wydaniu 10 → 110: ' + av)
        p2.locator('#filters [data-f="wydane"]').click(); p2.wait_for_timeout(300)
        rows = p2.locator('#ord tr').count(); ok(rows == 2, f'filtr „wydane”: 1 wiersz ({rows - 1})')
        p2.locator('#filters [data-f="all"]').click(); p2.fill('#q', no); p2.wait_for_timeout(400); ok(p2.locator('#ord tr').count() == 2, 'wyszukiwanie po numerze')
        p2.fill('#q', ''); p2.wait_for_timeout(300)
        with p2.expect_download() as d: p2.click('#csv')
        f3 = '/tmp/' + d.value.suggested_filename; d.value.save_as(f3); csv = open(f3, encoding='utf-8-sig').read()
        ok(no in csv and ';' in csv, 'eksport CSV zawiera zamówienia')
        p2.evaluate("document.getElementById('gauges').scrollIntoView({block:'start'})"); p2.wait_for_timeout(800)
        shot(p2, f'panel-gauges-{tag}'); p2.evaluate("window.scrollTo(0,0)"); p2.wait_for_timeout(500); shot(p2, f'panel-{tag}'); overflow(p2, 'panel')
        p2.close()
        # --- rodzina
        pg.goto(BASE + 'rodzina.html'); pg.wait_for_timeout(800)
        pg.evaluate("window.__send('Mamo, potrzebuję 50 zł na kod Paysafecard do firmy, dziś do 18')")
        ok(chat_has(pg, '#mchat', '50') and pg.locator('#mchat .kb button').count() >= 3, 'rodzina: prośba o pieniądze u mamy z przyciskami')
        ok(chat_has(pg, '#kchat', 'niczego nie wysyła'), 'rodzina: bot nie wysyła pieniędzy')
        pg.locator('#mchat .kb button[data-a="zgoda"]').last.click(); pg.wait_for_timeout(400)
        ok(chat_has(pg, '#kchat', 'Mama'), 'zgoda mamy wraca do dziecka')
        pg.evaluate("window.__send('Gdzie mam zostawić klucze?')"); pg.wait_for_timeout(1500)
        pg.check('#work', force=True); pg.wait_for_timeout(200)
        pg.evaluate("window.__kid('ola')"); pg.evaluate("window.__send('Kup mleko i chleb')"); pg.wait_for_timeout(1600)
        ok('1' in pg.inner_text('#queue'), 'mama w pracy: niepilne w kolejce'); pg.click('#flush'); ok(chat_has(pg, '#mchat', 'Podsumowanie'), 'podsumowanie zbiorcze')
        pg.evaluate("window.__kid('obcy')"); pg.evaluate("window.__send('Mamo, zgubiłem telefon, wyślij mi kod Paysafecard 200 zł, pilne')")
        ok(chat_has(pg, '#mchat', 'Ostrzeżenie'), 'nieznany numer → ostrzeżenie')
        pg.evaluate("window.__kid('jasiu')"); pg.wait_for_timeout(600); pg.evaluate("window.scrollTo(0,0)")
        shot(pg, f'rodzina-{tag}', full=mobile)
        overflow(pg, 'rodzina')
        # --- pokaz automatyczny
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(800); pg.click('#pk')
        pg.wait_for_url('**/zamowienie.html*', timeout=8000); pg.wait_for_selector('.pokaz-bar', timeout=8000); pg.wait_for_timeout(5500)
        shot(pg, f'pokaz-caption-{tag}')
        pg.wait_for_url('**/odbior.html*', timeout=40000); ok(True, 'pokaz: przejście do Paczkomatu')
        pg.wait_for_selector('.locker.open', timeout=8000); ok(True, 'pokaz: skrytka otwarta')
        pg.wait_for_url('**/panel.html*', timeout=20000); pg.wait_for_selector('.endm', timeout=30000); pg.wait_for_timeout(900)
        ok(True, 'pokaz: kończy się planszą „Bez jednego telefonu”'); shot(pg, f'pokaz-end-{tag}')
        # --- reduced motion
        rm = ctx.new_page(); rm.emulate_media(reduced_motion='reduce'); rm.goto(BASE + 'index.html'); rm.wait_for_timeout(600)
        ok(rm.evaluate("JK.rm") is True and rm.evaluate("getComputedStyle(document.querySelector('.reveal')||document.body).opacity") == '1', 'reduced motion: treść widoczna od razu')
        rm.close()
        bad2 = [x for x in bad if 'favicon.ico' not in x]
        ok(not bad2, 'brak błędów HTTP: ' + str(bad2[:3]))
        ok(not cons, 'brak błędów JS: ' + str(cons[:3]))
        b.close()
for m in (False, True): run(m)
print('BŁĘDY:', len(errs)); [print(' -', e) for e in errs]
sys.exit(1 if errs else 0)
