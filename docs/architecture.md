# Trailer Studio — Architektura

Lokalny, offline-first edytor trailerów (pion 9:16, max 20s, eksport MP4) dla gier HTML5
publikowanych na CrazyGames. PWA, GitHub Pages, bez backendu/Firebase/bazy danych — dane
projektu w IndexedDB, proste ustawienia w localStorage.

## Stos technologiczny

HTML5, CSS, JavaScript (natywne ES Modules — `<script type="module">`, bez bundlera),
Canvas API + HTML5 Video API do podglądu, FFmpeg.wasm wyłącznie do eksportu MP4. Bez
frameworków.

## Struktura folderów

```
index.html, manifest.json, service-worker.js, icons/
src/
  app.js            — bootstrap/orchestrator
  config.js         — stałe (MAX_DURATION_SECONDS, ASPECT_RATIO, ...)
  core/             — event-bus.js, events.js, types.js, logger.js, errors.js
  storage/          — db.js (IndexedDB), projects-store.js, media-store.js, settings-store.js
  modules/
    project-manager/
    media-manager/
    timeline-engine/ (+ effects/: effect-registry, fade, zoom, glitch, pan)
    template-system/ (+ templates/: crazygames-default)
    preview-engine/  (canvas-renderer.js, playback-clock.js)
    export-engine/   (export-engine.js — renderuje klatki i steruje FFmpeg.wasm)
    json-parser/
  ui/views/          — kontrolery widoków
  styles/            — CSS
  vendor/ffmpeg/
    lib/             — vendorowany @ffmpeg/ffmpeg (ESM: classes.js, worker.js, ...)
    core/            — vendorowany @ffmpeg/core (ffmpeg-core.js + ffmpeg-core.wasm, ~30MB)
```

`@ffmpeg/ffmpeg`'s ESM build zarządza własnym Web Workerem (`vendor/ffmpeg/lib/worker.js`,
rozwiązywanym relatywnie przez `import.meta.url`) — nie potrzeba osobnego,
własnoręcznie pisanego wrappera workera; biblioteka już izoluje ciężką pracę WASM od
głównego wątku. `ffmpeg-core.wasm` (~30MB) jest wpisany do serwisu jako plik statyczny, ale
celowo **nie jest precache'owany** przy instalacji PWA — Service Worker cache'uje go
dopiero przy pierwszym realnym eksporcie (cache-on-demand), żeby instalacja aplikacji nie
wymagała pobrania 30MB dla użytkowników, którzy nigdy nie eksportują.

## PWA

`manifest.json` używa wyłącznie ścieżek względnych (`start_url`/`scope: "./"`), żeby
działać zarówno pod domeną główną, jak i pod subpath GitHub Pages
(`user.github.io/Trailermaker/`). `service-worker.js` cache'uje app shell (HTML/JS/CSS/
ikony) strategią cache-first z wersjonowaną nazwą cache (`trailer-studio-v1`); stare cache
są czyszczone przy `activate`. Media i projekty **nie** są cache'owane przez Service
Workera — żyją wyłącznie w IndexedDB.

## Komunikacja między modułami

- **EventBus** (`core/event-bus.js`, singleton) — powiadomienia o zmianach stanu
  (`TIMELINE_UPDATED`, `PROJECT_CHANGED`, `MEDIA_IMPORTED`, ...). Nazwy eventów jako stałe w
  `core/events.js`.
- **Bezpośrednie wywołania (Promise)** — operacje request/response zwracające wartość,
  np. `MediaManager.importMedia(file)`, `ExportEngine.exportProject(project)`.
- Moduły eksportują wyłącznie named exports; stan modułowy działa jako naturalny singleton
  dzięki cache'owaniu modułów ES — brak zmiennych globalnych.
- `app.js` inicjalizuje IndexedDB, rejestruje Service Workera, importuje samorejestrujące się
  efekty/szablony i montuje `EditorView`.

## Moduły (wszystkie w pełni działające)

1. **Project Manager** — `createProject`, `validateProject`, `saveProject`, `loadProject`,
   `listProjects`, `deleteProject`, `getActiveProject`, `setActiveProject`. Jedyne źródło
   prawdy o aktywnym projekcie.
2. **Media Manager** — `importMedia`, `getMedia`, `listMedia`, `deleteMedia`,
   `getObjectURL`. Jedyna brama do Blobów mediów.
3. **Timeline Engine** — `addClip`, `removeClip`, `updateClipTiming`, `reorderClip`,
   `addEffect`, `removeEffect`, `addTextOverlay`, `getTotalDuration`, `getClips`. Efekty
   jako rozszerzalny rejestr (`effects/effect-registry.js`), realnie rysowane na Canvas
   (fade/zoom/glitch/pan).
4. **Template System** — `registerTemplate`, `listTemplates`, `getTemplate`,
   `applyTemplate`. Wbudowany szablon `crazygames_default` kończący się logo gry + logo
   studia.
5. **Preview Engine** — Canvas + HTML5 Video, bez ffmpeg. `attach`, `play`, `pause`,
   `seek`, `getCurrentTime`. rAF-owy zegar, leniwe ładowanie mediów, natywne odtwarzanie
   wideo dla aktywnego klipu.
6. **Export Engine** — `exportProject(project, options)`, `onProgress(handler)`. Renderuje
   projekt klatka-po-klatce na osobnym Canvasie (te same funkcje co Preview Engine —
   `canvas-renderer.js` — więc podgląd i eksport nigdy się nie rozjeżdżają), zapisuje
   klatki jako PNG do wirtualnego FS FFmpeg.wasm, koduje `libx264`/`yuv420p` do MP4 i
   zwraca `Blob`. FFmpeg jest ładowany i terminowany przy każdym eksporcie — nigdy nie
   działa w tle podczas podglądu.
7. **JSON Parser** — `validateScenario`, `scenarioToProject`, `importScenarioJson`. Logika
   czysto strukturalna, zgodna ze stałym schematem JSON generowanym przez AI (`version`,
   `project`, `template`, `scenes[]`, `outro`).
8. **History Manager** (v0.5, `modules/history-manager/`) — `undo`, `redo`, `canUndo`,
   `canRedo`. Nie ma własnej logiki śledzenia zmian per moduł — po prostu nasłuchuje tych
   samych zdarzeń EventBus, na które reagują już wszystkie widoki
   (`TIMELINE_UPDATED`/`PROJECT_CHANGED`), robi głęboką kopię `Project` przy każdej zmianie
   i przy `undo`/`redo` podmienia aktywny projekt przez `ProjectManager.setActiveProject`.
   Dzięki temu żaden inny moduł nie musiał zostać dotknięty — UI już reagował na zmianę
   aktywnego projektu. Historia resetuje się przy wczytaniu innego zapisanego projektu
   (`PROJECT_LOADED`).

## IndexedDB (`src/storage/db.js`)

Baza `trailer-studio-db`, wersja 1:
- `projects` (keyPath `id`, indeksy `updatedAt`, `title`) — pełny obiekt `Project`.
- `mediaAssets` (keyPath `id`, indeksy `type`, `createdAt`) — `MediaAsset` łącznie z
  natywnym `Blob`.

Proste ustawienia → `localStorage` przez `settings-store.js` (klucze
`trailerstudio:settings:*`).

## Konwencje

Pliki: kebab-case. Funkcje/zmienne: camelCase. Typy: PascalCase (zdefiniowane w
`core/types.js` jako JSDoc `@typedef`, brak runtime exportów). Stałe: SCREAMING_SNAKE_CASE
(`config.js`, `core/events.js`). Błędy niestandardowe: `core/errors.js`
(`NotImplementedError`, `ValidationError`, `SchemaError`, `StorageError`). Wyłącznie named
exports. Jedna odpowiedzialność na plik.

## Etapy (wszystkie zrealizowane)

- **ETAP 1** — architektura: struktura folderów, PWA, szkielet modułów, kontrakty API,
  w pełni działające `core/`, `storage/`, JSON Parser.
- **ETAP 2** — UI: panel mediów, timeline, podgląd, ustawienia, szablony.
- **ETAP 3** — logika MVP: import plików, zarządzanie mediami, timeline, zapisywanie/
  odczytywanie projektu, realne rysowanie Canvas (Preview Engine, efekty).
- **ETAP 4** — eksport MP4 przez FFmpeg.wasm (vendorowany lokalnie w `src/vendor/ffmpeg/`,
  cache'owany on-demand, nigdy z CDN).

**v0.5 (w toku):** undo/redo ✅ (`history-manager`, przyciski w headerze). Pozostałe:
wiele ścieżek, autosave, edytor szablonów, eksport/import projektów jako pliki.

**v1.0 (nierozpoczęte):** keyframe'y, animacje tekstu, pluginy, więcej efektów,
zaawansowany timeline, optymalizacja wydajności.
