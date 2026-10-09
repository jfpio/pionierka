# Pionierka — projektant obozowy

**[Otwórz aplikację →](https://pionierka-projektant.jfpio.chatgpt.site)**

Interaktywny projektant prycz i regałów do namiotu harcerskiego z edytowalnymi wymiarami. Pomaga zaplanować układ konstrukcji, sprawdzić ich dopasowanie i przygotować zestawienie materiałów na obóz.

## Możliwości

- Dodawanie prycz i regałów, zmiana wymiarów i liczby poziomów, przesuwanie oraz obracanie konstrukcji.
- Edycja szerokości, długości oraz wysokości ścian i kalenicy namiotu; parametry są zapisywane razem z projektem.
- Widok 3D oraz widoki z góry, od wejścia i z boku; możliwość ukrycia dachu.
- Łączenie konstrukcji ze wspólnymi żerdziami i podgląd dopasowania przed połączeniem.
- Sprawdzanie kolizji między konstrukcjami, z dachem i trzema masztami oraz odstępu od boków i tyłu namiotu.
- Zestawienie żerdzi, materiału na posłania i desek na półki, z uwzględnieniem wspólnych elementów.
- Cofanie i ponawianie zmian, zapis i otwieranie projektów w pamięci przeglądarki.
- Drukowanie projektu; zapis do PDF przez okno drukowania przeglądarki.
- „Porady pionierkowe "Orła"”: oryginalny skrypt instruktorski Agricola ’12 do pobrania w PDF.

## Uruchomienie lokalne

Wymagania: Node.js **≥ 22.13.0**, npm i Git. Zalecany Node.js 24. Projekt można uruchomić na macOS, Windows i Linux.

```sh
git clone https://github.com/jfpio/pionierka.git
cd pionierka
npm run install:ci
npm run dev
```

Domyślny adres: [http://localhost:5173](http://localhost:5173). Port można zmienić przez `npm run dev -- --port 5174`.

Aplikacja korzysta obecnie z pamięci przeglądarki; do projektowania nie trzeba konfigurować bazy danych ani kluczy API.

## Budowanie i testy

```sh
npm run build
npm start
```

Build trafia do `dist/`. `npm start` uruchamia lokalny podgląd zbudowanego Workera przez Wrangler; użyj adresu wypisanego w terminalu.

Testy modelu geometrii, edycji namiotu, kolizji, łączenia konstrukcji, zestawienia materiałów i walidacji zapisów:

```sh
node --experimental-strip-types --test scripts/model.test.mjs
```

Na Node.js 24 działa także `node --test scripts/model.test.mjs`. Flaga powyżej umożliwia import modelu TypeScript również na Node.js 22.13.0.

## Technologia i struktura

Aplikacja wykorzystuje React, TypeScript, Three.js i Tailwind CSS. Działa na Vinext/Vite z wyjściem dla Cloudflare Workers, a opublikowana wersja jest hostowana w Sites.

- `app/` — projektant, model geometrii, scena 3D, zapis projektów, raport do druku i porady.
- `public/materialy/pionierka-obozowa-orzel.pdf` — oryginalny skrypt instruktorski do pobrania.
- `scripts/model.test.mjs` — testy modelu.
- `.openai/hosting.json` — powiązanie projektu z istniejącą stroną Sites.

Publikacja kodu na GitHubie nie uruchamia automatycznego wdrożenia. Aktualizacje strony są publikowane osobno przez Sites. Pliki zależności, buildów, środowiska i lokalnego stanu narzędzi są ignorowane przez Git.

## Założenia wersji demo

Domyślny namiot ma 400 × 500 cm, 160 cm wysokości przy ścianie i 250 cm w kalenicy. Te wymiary można zmienić w panelu parametrów namiotu; widok 3D, sprawdzanie dopasowania i wydruk korzystają z aktualnych wartości. Model przyjmuje trzy maszty o średnicy 8 cm. Od boków i tyłu wymagany jest odstęp co najmniej 20 cm; przy wejściu nie jest wymagany odstęp.

Projektant sprawdza geometrię konstrukcji. Nie ocenia ich wytrzymałości ani przestrzeni potrzebnej śpiącej osobie. Porady kursowe są materiałem pomocniczym; nie wszystkie ich zalecenia są automatycznymi regułami projektanta.

Zapisy pozostają w tej przeglądarce na tym urządzeniu. Usunięcie danych przeglądarki usuwa zapisane projekty, a niezapisany projekt znika po odświeżeniu strony.

## Materiały i informacje licencyjne

Na stronie dostępny jest oryginalny PDF **„Pionierka obozowa — Skrypt instruktorski Orzeł”**, autorstwa **Roberta Chalimoniuka „Orła”**, przygotowany na **Agricolę 2012**. Zachowano dokument bez zmian, wraz z oznaczeniem **„Do użytku wewnątrzorganizacyjnego”**. [Pobierz skrypt](public/materialy/pionierka-obozowa-orzel.pdf) lub [przeczytaj o autorze](https://www.jakobstaf.pl/o-nas/druzyna-jakobstaf/robert-chalimoniuk).

Repozytorium nie nadaje nowej licencji kodowi ani materiałom kursowym. Informacje licencyjne dołączonych komponentów znajdują się w `vendor/shadcn-tailwind-4.13.0.LICENSE.md` i `build/sites-vite-plugin.LICENSE`.
