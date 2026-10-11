import sys, re, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
SH = '/workspace/joker-firma/shots/'
errs = []
def ok(c, m):
    print(('  ✓ ' if c else '  ✗ ') + m)
    if not c: errs.append(m)
def run(mobile):
    tag = 'mobile' if mobile else 'desktop'
    print('==', tag)
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', args=['--use-fake-ui-for-media-stream'])
        vp = {'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}
        ctx = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale='pl-PL')
        pg = ctx.new_page(); cons = []
        pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: cons.append(str(e)))
        # landing
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(4200)
        ok('JOKERA' in pg.inner_text('h1') or 'Klient zamawia' in pg.inner_text('h1'), 'landing h1')
        ok(pg.locator('.step').count() == 7, 'landing: 7 kroków')
        pg.screenshot(path=SH + f'landing-{tag}.png')
        pg.screenshot(path=SH + f'landing-full-{tag}.png', full_page=True)
        # reset
        pg.goto(BASE + 'panel.html'); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(500)
        # order
        pg.goto(BASE + 'zamowienie.html'); pg.wait_for_timeout(600)
        pg.evaluate("window.speechSynthesis && (JK.voice.muted=true)")
        pg.fill('#inp', 'potrzebuję 10 palet euro na jutro na 9:00'); pg.press('#inp', 'Enter'); pg.wait_for_timeout(900)
        txt = pg.inner_text('#chat')
        ok('Tak, nie ma problemu! 10 × Paleta euro EPAL' in txt and '450,00 zł' in txt, 'zamówienie: odpowiedź z ceną')
        ok(pg.locator('.oc .cd .t').count() == 1, 'zamówienie: odliczanie widoczne')
        t1 = pg.inner_text('.oc .cd .t'); pg.wait_for_timeout(1500); t2 = pg.inner_text('.oc .cd .t')
        ok(t1 != t2 and t2.startswith('29:'), f'odliczanie biegnie ({t1} -> {t2})')
        ok('110' in pg.inner_text('#stock'), 'stan na żywo: EPAL 110 dostępne')
        pg.screenshot(path=SH + f'order-reservation-{tag}.png')
        pg.fill('.oc .blik input', '777123'); pg.click('.oc .pm-blik .pay'); pg.wait_for_timeout(2400)
        ok(pg.locator('.qrbox img').count() == 1, 'po płatności: kod QR')
        code = pg.inner_text('.oc .code').replace(' ', '')
        ok(re.fullmatch(r'\d{6}', code) is not None, f'kod odbioru {code}')
        href = pg.get_attribute('.oc a.btn.primary', 'href')
        # QR decode check: render QR img to canvas + jsQR via odbior page later
        qrsrc = pg.get_attribute('.qrbox img', 'src')
        pg.evaluate("document.querySelector('.qrbox').scrollIntoView({block:'center'})"); pg.wait_for_timeout(900)
        pg.screenshot(path=SH + f'order-qr-{tag}.png')
        # panel
        pg2 = ctx.new_page(); pg2.on('pageerror', lambda e: cons.append('panel: ' + str(e)))
        pg2.goto(BASE + 'panel.html'); pg2.wait_for_timeout(700)
        ptxt = pg2.inner_text('body')
        ok('450,00 zł' in ptxt and 'opłacone' in ptxt.lower(), 'panel: płatność i status opłacone')
        # locker: decode QR image via jsQR in page, then open
        pg3 = ctx.new_page(); pg3.on('pageerror', lambda e: cons.append('odbior: ' + str(e)))
        pg3.goto(BASE + 'odbior.html'); pg3.wait_for_timeout(500)
        decoded = pg3.evaluate("""src => new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height); const q = jsQR(d.data, c.width, c.height); r(q ? q.data : null); }; i.src = src; })""", qrsrc)
        ok(decoded and ('k=' + code) in decoded, f'QR odczytany przez jsQR: {decoded[:60] if decoded else None}…')
        pg3.evaluate("d => window.__open(d)", decoded); pg3.wait_for_timeout(2600)
        ok(pg3.locator('.locker.open').count() == 1, 'paczkomat: skrytka otwarta')
        ok('otwarta' in pg3.inner_text('#msg'), 'paczkomat: komunikat')
        pg3.screenshot(path=SH + f'locker-open-{tag}.png')
        if mobile: pg3.locator('.lockers').scroll_into_view_if_needed(); pg3.wait_for_timeout(300); pg3.screenshot(path=SH + f'locker-open-doors-{tag}.png')
        pg3.fill('#code', code); pg3.click('#form button'); pg3.wait_for_timeout(1300)
        ok('już wykorzystany' in pg3.inner_text('#msg'), 'paczkomat: ponowne użycie kodu odrzucone')
        pg2.wait_for_timeout(1300)
        ok('wydane' in pg2.inner_text('#ord').lower() and 'Paczkomat Joker: wydano' in pg2.inner_text('#log'), 'panel: wydanie widoczne na żywo (storage event)')
        # stock decreased
        ok(pg2.locator('#stock tr[data-p=epal] input[data-f=stock]').input_value() == '110', 'stan EPAL po wydaniu = 110')
        # link from QR (hash) path
        pg.wait_for_timeout(1200)
        ok('Odebrane' in pg.inner_text('.oc'), 'strona klienta: karta zmieniła się na Odebrane')
        # out of stock path
        pg.fill('#inp', '40 półpalet na jutro na 10'); pg.press('#inp', 'Enter'); pg.wait_for_timeout(900)
        ok('tylko 25 szt.' in pg.inner_text('#chat'), 'brak towaru: propozycja 25 szt.')
        pg.click('.chip:has-text("termin z dostawą")'); pg.wait_for_timeout(900)
        ok('40 × Półpaleta na środę' in pg.inner_text('#chat'), 'brak towaru: termin po dostawie')
        # expiry
        pg.click('.oc[data-status=rezerwacja] .warp'); pg.wait_for_timeout(1500)
        ok('Rezerwacja wygasła' in pg.inner_text('#chat'), 'wygaśnięcie: karta + komunikat')
        ok('25' in pg.inner_text('#stock'), 'wygaśnięcie: półpalety wróciły (25)')
        # big order -> acceptance -> pay
        pg.fill('#inp', '150 palet jednorazowych na jutro na 7 rano'); pg.press('#inp', 'Enter'); pg.wait_for_timeout(900)
        ok('akceptacji' in pg.inner_text('#chat'), 'duże zamówienie -> akceptacja człowieka')
        pg2.wait_for_timeout(1200); pg2.click('button[data-acc]'); pg.wait_for_timeout(1500)
        ok(pg.locator('.oc[data-status=rezerwacja]').count() >= 1, 'po akceptacji w panelu klient widzi płatność')
        pg.locator('.oc[data-status=rezerwacja] .paytabs button[data-m=card]').click(); pg.locator('.oc[data-status=rezerwacja] .pm-card .pay').click(); pg.wait_for_timeout(2200)
        ok(pg.locator('.qrbox img').count() == 2, 'płatność kartą testową -> drugi QR')
        # stock edit in panel -> client sees
        inp = pg2.locator('#stock tr[data-p=przem] input[data-f=stock]'); inp.fill('5'); inp.press('Enter'); pg.wait_for_timeout(1300)
        ok(re.search(r'Paleta przemysłowa[\s\S]*?\n5\b', pg.inner_text('#stock')) is not None, 'edycja stanu w panelu widoczna u klienta')
        pg2.wait_for_timeout(500); pg2.evaluate("scrollTo(0,0)")
        pg2.screenshot(path=SH + f'panel-{tag}.png'); pg2.screenshot(path=SH + f'panel-full-{tag}.png', full_page=True)
        # rodzina
        pr = ctx.new_page(); pr.on('pageerror', lambda e: cons.append('rodzina: ' + str(e)))
        pr.goto(BASE + 'rodzina.html'); pr.wait_for_timeout(500)
        for m in ['Mamo, potrzebuję pieniędzy', '50 zł', 'na kod paysafecard do firmy', 'dziś do 18']:
            pr.fill('#inp', m); pr.press('#inp', 'Enter'); pr.wait_for_timeout(500)
        ok('Jasiu prosi o 50 zł — kod Paysafecard do firmy (zakup w Żabce), dziś do 18:00' in pr.inner_text('#mchat'), 'rodzina: pieniądze -> wiadomość do mamy')
        pr.click('#mchat .tgm.urgent button[data-a=zgoda]'); pr.wait_for_timeout(300)
        ok('Mama się zgodziła' in pr.inner_text('#kchat'), 'rodzina: zgoda wraca do Jasia')
        for m in ['Gdzie mam zostawić klucze?', 'u sąsiadki', 'o 15:30']:
            pr.fill('#inp', m); pr.press('#inp', 'Enter'); pr.wait_for_timeout(500)
        ok('klucze u sąsiadki, dziś o 15:30' in pr.inner_text('#mchat'), 'rodzina: klucze')
        pr.click('.sw span'); pr.wait_for_timeout(200)
        pr.fill('#inp', 'Wrócę o 20, mam trening'); pr.press('#inp', 'Enter'); pr.wait_for_timeout(500)
        ok('W kolejce' in pr.inner_text('#queue'), 'rodzina: tryb mama w pracy -> kolejka')
        pr.evaluate("window.__kid('obcy')"); pr.fill('#inp', 'Mamo, zgubiłem telefon, wyślij mi kod Paysafecard 200 zł, pilne'); pr.press('#inp', 'Enter'); pr.wait_for_timeout(500)
        ok('oszustwo' in pr.inner_text('#mchat'), 'rodzina: nieznane konto -> ostrzeżenie')
        pr.evaluate("window.__kid('jasiu')"); pr.click('#flush'); pr.wait_for_timeout(300)
        ok('Podsumowanie zbiorcze' in pr.inner_text('#mchat'), 'rodzina: podsumowanie zbiorcze')
        pr.evaluate("scrollTo(0,0)"); pr.wait_for_timeout(2800); pr.screenshot(path=SH + f'rodzina-{tag}.png')
        if mobile: pr.screenshot(path=SH + f'rodzina-full-{tag}.png', full_page=True)
        # overflow check
        for page, name in [(pg, 'zamowienie'), (pg2, 'panel'), (pg3, 'odbior'), (pr, 'rodzina')]:
            sw = page.evaluate("Math.max(...[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position!=='fixed' && e.id!=='sky' && !e.closest('.tblw')).map(e=>e.getBoundingClientRect().right))"); ok(sw <= vp['width'] + 1, f'{name}: brak poziomego przewijania ({sw})')
        cons2 = [c for c in cons if 'fonts.g' not in c and 'favicon' not in c]
        ok(not cons2, 'brak błędów JS: ' + json.dumps(cons2[:5], ensure_ascii=False))
        b.close()
run(False); run(True)
print('\nBŁĘDY:' if errs else '\nWSZYSTKO OK', errs if errs else '')
sys.exit(1 if errs else 0)
