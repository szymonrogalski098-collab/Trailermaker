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
    export-engine/   (+ ffmpeg-worker.js)
    json-parser/
  ui/views/          — kontrolery widoków (ETAP 2)
  styles/            — CSS (ETAP 2)
  vendor/ffmpeg/     — pliki ffmpeg.wasm (ETAP 4)
```

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

## Moduły (ETAP 1: publiczne API + JSDoc, stub tam gdzie zależy od Canvas/DOM/ffmpeg)

1. **Project Manager** — `createProject`, `validateProject`, `saveProject`, `loadProject`,
   `listProjects`, `deleteProject`, `getActiveProject`, `setActiveProject`. Jedyne źródło
   prawdy o aktywnym projekcie.
2. **Media Manager** — `importMedia`, `getMedia`, `listMedia`, `deleteMedia`,
   `getObjectURL`. Jedyna brama do Blobów mediów.
3. **Timeline Engine** — `addClip`, `removeClip`, `updateClipTiming`, `reorderClip`,
   `addEffect`, `removeEffect`, `addTextOverlay`, `getTotalDuration`, `getClips`. Efekty
   jako rozszerzalny rejestr (`effects/effect-registry.js`); rysowanie na Canvas — ETAP 3.
4. **Template System** — `registerTemplate`, `listTemplates`, `getTemplate`,
   `applyTemplate`. Wbudowany szablon `crazygames_default` kończący się logo gry + logo
   studia.
5. **Preview Engine** — Canvas + HTML5 Video, bez ffmpeg. `attach`, `play`, `pause`,
   `seek`, `getCurrentTime`. Realne rysowanie — ETAP 3 (stub w ETAP 1).
6. **Export Engine** — `exportProject`, `onProgress`. Stub w ETAP 1 (`NotImplementedError`),
   realna integracja FFmpeg.wasm w ETAP 4.
7. **JSON Parser** — `validateScenario`, `scenarioToProject`, `importScenarioJson`. W pełni
   działające już w ETAP 1 — logika czysto strukturalna, zgodna ze stałym schematem JSON
   generowanym przez AI (`version`, `project`, `template`, `scenes[]`, `outro`).

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

## Etapy

- **ETAP 1 (ten dokument)** — architektura: struktura folderów, PWA, szkielet modułów,
  kontrakty API, w pełni działające `core/`, `storage/`, JSON Parser.
- **ETAP 2** — UI: panel mediów, timeline, podgląd, ustawienia, szablony.
- **ETAP 3** — logika MVP: import plików, zarządzanie mediami, timeline, zapisywanie/
  odczytywanie projektu, realne rysowanie Canvas (Preview Engine, efekty).
- **ETAP 4** — eksport MP4 przez FFmpeg.wasm.

Przyszłe wersje (nieplanowane teraz): v0.5 — wiele ścieżek, undo/redo, autosave, edytor
szablonów, eksport/import projektów; v1.0 — keyframe'y, animacje tekstu, pluginy, więcej
efektów, zaawansowany timeline, optymalizacja wydajności.
