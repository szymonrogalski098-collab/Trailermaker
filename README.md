# Redstone Studio

Mobilny (touch-first) edytor i symulator redstone dla **Minecraft Java Edition**. Czysty HTML5 + moduły ES, bez builda.
Działa offline po pierwszym załadowaniu (PWA: manifest + service worker).

## Uruchomienie
```
npx http-server .        # albo dowolny statyczny serwer; SW wymaga https lub localhost
node tests/run.js        # testy silnika (headless, bez frameworka)
```
Three.js r128 jest przypięty z cdnjs (`index.html`) i cache'owany przez service worker.

## Sterowanie
**Górny pasek:** `2D/3D` przełącza widok (wspólny świat i warstwa), `-` / `+` zmienia warstwę Y, `Przekrój` ukrywa wszystko nad warstwą (3D),
`Start/Pauza`, `Krok` (1 tik gry), prędkość `0.25x / 1x / 2x / 4x` (20 TPS bazowo), licznik tików, `Debug` (moc pyłu w 2D, FPS, tiki), przycisk wyśrodkowania.

**Dolny pasek – tryby** (tap wykonuje dokładnie akcję aktywnego trybu):
| Tryb | Akcja |
|---|---|
| Stawiaj | dotknięcie pokazuje podgląd, puszczenie stawia; przeciągnięcie poza ~12 px anuluje. W 3D: na ścianie klikniętego bloku (raycast). Długie przytrzymanie na postawionym bloku obraca go. |
| Usuń | usuwa blok |
| Użyj | dźwignia, przycisk, płyta (przełącz ręcznie), przekaźnik (cykl opóźnienia 1-4), komparator (porównanie/odejmowanie), czujnik światła (dzień/noc/odwrócony), tarcza |
| Zaznacz | dwa tapy = prostokątny region (3D: box); `Kopiuj` / `Wytnij` / `Wklej` (tap = lewy-dolny róg wklejki) |

**Paleta** (chip z wybranym blokiem): zakładki Redstone / Zasilanie / Wełna / Bloki / Inne. `Obróć` cykluje kierunek wybranego bloku
(dla pochodni, dźwigni i przycisków: podłoga + 4 ściany). Undo/Redo (200 kroków, obejmuje też skutki kaskady redstone).

**Gesty 2D:** pinch = zoom, dwa palce = przesuwanie (we wszystkich trybach), jeden palec = przesuwanie w trybie Użyj.
**Gesty 3D:** jeden palec = orbita, pinch = zoom, dwa palce = przesuwanie. Ruch palcem po dotknięciu anuluje stawianie.

**Menu (☰):** wyczyść warstwę / świat, zapisy (nazwane sloty w `localStorage`), eksport/import JSON, ustawienia (rozmiar siatki 16-64, język PL/EN), instalacja PWA.
Autosave (debounce) i ustawienia (rozmiar, prędkość, widok, ostatnia warstwa) zapisują się automatycznie.

## Format JSON
```
{ version: 1, size:[x,y,z], palette:["air","stone",...], blocks:[RLE: wartość,ile,...], states:[RLE], metadata:{...} }
```
Import waliduje wersję, rozmiar, paletę i długość danych i pokazuje czytelny błąd.

## Architektura (`src/`)
`blocks.js` rejestr + układ bitów stanu · `world.js` dane (typed arrays) · `power.js` zapytania o sygnał · `behaviors.js` reakcje bloków ·
`piston.js` · `engine.js` (RedstoneEngine: kolejki update'ów, scheduled ticki, block events) · `editor.js` (akcje, historia, schowek) ·
`layer2d.js` + `icons.js` (Canvas 2D) · `view3d.js` + `models.js` (Three.js, InstancedMesh na chunk) · `gestures.js` · `ui.js` · `storage.js` · `i18n.js` · `app.js`.
Silnik nie zawiera kodu renderującego i jest testowalny w Node. Szczegóły odstępstw od vanilli: `ENGINE_NOTES.md`. Plan i układ bitów: `PLAN.md`.
