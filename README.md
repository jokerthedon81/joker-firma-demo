# JOKERAl Firma — demo

Interaktywne demo (tylko po stronie przeglądarki, bez serwera): klient zamawia palety czatem lub głosem, płaci testowo, dostaje bilet z kodem QR i odbiera towar w Paczkomacie Joker. Firma widzi wszystko na żywo w panelu.

**Na żywo:** https://jokerthedon81.github.io/joker-firma-demo/

| Strona | Co pokazuje |
|---|---|
| `index.html` | Strona główna, „Pokaz automatyczny”, sekcja **Dla firm** (problem, korzyści, przykładowy kalkulator ROI, cena, „Umów pokaz”) |
| `zamowienie.html` | Czat z asystentem (pisanie, głos pl-PL, szybkie odpowiedzi), rezerwacja 30 min z chronografem, zmiana ilości, cofnięcie, BLIK/karta (test), bilet z QR (PNG/PDF) |
| `odbior.html` | Paczkomat Joker: kod 6 cyfr albo skan QR kamerą/zdjęciem, otwarcie skrytki i rampy |
| `panel.html` | Panel firmy: KPI, obrotomierze stanów, wykres godzinowy, akceptacja dużych zamówień, filtry, CSV, edycja stanów/cen/dostaw |
| `rodzina.html` | JOKERAl Rodzina: czat dziecka + komunikator mamy z przyciskami, tryb „Mama w pracy”, ochrona przed oszustwem |

## Do podmiany przed prezentacją

Kontakt i cena to **atrapy** — jedno miejsce w `shared.js`:

```js
JK.CONFIG = { CONTACT_EMAIL: 'kontakt@example.com', CONTACT_TEL: '+48000000000', PRICE_LABEL: 'od X zł/mies.' };
```

Liczby w kalkulatorze ROI są przykładowe i tak oznaczone na stronie.

## Technika

- Czysty HTML/CSS/JS. Dane w `localStorage` (klucz `jokerFirma.v1`), więc stan jest osobny na każdym urządzeniu. Karty w kilku zakładkach synchronizują się na żywo.
- Logika: `firma-engine.js`, `rodzina-engine.js` (testowalne w Node).
- Wspólny `<head>`: `head.inc` + `python3 build.py` (uruchom po edycji strony).
- PWA: `manifest.webmanifest`, ikony w `icons/` (Dodaj do ekranu początkowego na iPhonie). Podgląd linku: `og.png`.
- Głos: Web Speech API (najlepiej Chrome i Safari; na iPhonie wymaga zgody na mikrofon). Dźwięk domyślnie wyłączony.
- Płatności są symulowane — nic nie jest pobierane.

## Testy

```bash
node test.js                                   # silniki (19 testów)
python3 -m http.server 8765 &
python e2e.py http://localhost:8765/           # E2E desktop + 390 px (Playwright, Chrome)
python e2e.py https://jokerthedon81.github.io/joker-firma-demo/ noshots
```

## Licencje zewnętrzne

- Fonty (hostowane lokalnie, `fonts/`): Cormorant Garamond i Inter — SIL Open Font License 1.1 (pliki licencji w `fonts/`).
- `vendor/qrcode.min.js` — qrcode-generator, Kazuhiko Arase, MIT.
- `vendor/jsQR.min.js` — jsQR, Cosmo Wolfe, Apache-2.0 (ładowany dopiero przy skanowaniu).
