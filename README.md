# JOKERAl Firma — demo

Klient zamawia, płaci i odbiera — bez rozmowy z człowiekiem.

Demo działa w całości w przeglądarce (bez serwera, bez płatnych API, bez LLM). Dane zapisują się w `localStorage`. Płatności są **testowe**.

- `index.html` — strona startowa
- `zamowienie.html` — zamówienie czatem lub głosem (Web Speech API, pl-PL), rezerwacja 30 min, płatność testowa, kod QR
- `odbior.html` — Paczkomat Joker: skan QR kamerą / ze zdjęcia / kod z klawiatury
- `panel.html` — panel firmy: stany, rezerwacje, zamówienia, płatności, wydania, akceptacja dużych zamówień
- `rodzina.html` — JOKERAl Rodzina: dziecko ↔ mama (symulacja Telegrama)

Testy: `node test.js` (silnik), `python e2e.py` (Chrome headless, Playwright).

Biblioteki w `vendor/`: qrcode-generator (MIT, Kazuhiko Arase), jsQR (Apache-2.0).
