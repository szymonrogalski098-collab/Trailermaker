# Plan

## Moduły (`src/`)
- `blocks.js`  – rejestr bloków (id, nazwa, kategoria, flagi), układ bitów `state`, kierunki.
- `world.js`   – World: `Uint16Array ids` + `Uint32Array states`, bounds, listener zmian, dirty-tracking.
- `power.js`   – zapytania o sygnał (strong/weak, dust connections) – czyste funkcje nad World.
- `behaviors.js` – reakcje bloków: neighbor-update, scheduled-tick, interact (repeater, torch, lamp, comparator, observer...).
- `piston.js`  – resolver pchania (limit 12), extend/retract.
- `engine.js`  – RedstoneEngine: kolejka neighbor-updates (FIFO), kolejka scheduled-ticków (czas, priorytet, seq), block events, budżet 100k.
- `layer2d.js`, `view3d.js`, `ui.js`, `storage.js`, `i18n.js`, `app.js`.

## Bity `state` (Uint32)
| bity | pole |
|---|---|
| 0-2 | facing (0=W,1=E,2=D,3=U,4=N,5=S) |
| 3-4 | face (0 podłoga, 1 ściana, 2 sufit) |
| 5-8 | power (0-15; dust, comparator output) |
| 9 | powered / lit |
| 10-11 | delay (0-3 => 1-4 redstone ticków) |
| 12 | locked |
| 13 | extended / open |
| 14 | subtract (comparator) / sticky (głowica) |
| 15-16 | tryb daylight (0 dzień,1 noc,2 odwrócony) |

## Algorytm silnika
1. Zmiana bloku -> `setBlock` -> pierścień update'ów (sąsiedzi w kolejności W,E,D,U,N,S, + dla źródeł sąsiedzi sąsiadów) do kolejki FIFO; obserwatory dostają zdarzenie zmiany.
2. `drain()` przetwarza kolejkę: każdy blok reaguje (dust przelicza moc = max(zewn., sąsiad-1), repeater/torch/lamp/comparator planują tick).
3. `step()`: czas++, scheduled ticki o `time<=now` posortowane (czas, priorytet, seq), po każdym `drain()`; potem block events (tłoki).
4. Budżet update'ów/tick (100k) -> flaga `overflow`.
