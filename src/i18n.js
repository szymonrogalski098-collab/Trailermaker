// All UI strings. Default language: Polish. Switch with setLang('en').
const DICT = {
  pl: {
    app: 'Redstone Studio', mode_place: 'Stawiaj', mode_remove: 'Usuń', mode_interact: 'Użyj', mode_select: 'Zaznacz',
    rotate: 'Obróć', palette: 'Paleta', undo: 'Cofnij', redo: 'Ponów', more: 'Menu', layer: 'Warstwa',
    view2d: '2D', view3d: '3D', play: 'Start', pause: 'Pauza', step: 'Krok', ticks: 'Tiki', slice: 'Przekrój',
    tab_redstone: 'Redstone', tab_power: 'Zasilanie', tab_wool: 'Wełna', tab_solid: 'Bloki', tab_other: 'Inne',
    clear_layer: 'Wyczyść warstwę', copy: 'Kopiuj', cut: 'Wytnij', paste: 'Wklej', cancel: 'Anuluj', close: 'Zamknij',
    save: 'Zapisz', load: 'Wczytaj', delete: 'Usuń', export: 'Eksport JSON', import: 'Import JSON', settings: 'Ustawienia',
    slots: 'Zapisy', slot_name: 'Nazwa zapisu', grid_size: 'Rozmiar siatki', apply: 'Zastosuj', language: 'Język',
    debug: 'Debug', new_world: 'Nowy świat', overflow: 'Przekroczono limit aktualizacji – symulacja wstrzymana',
    saved: 'Zapisano', loaded: 'Wczytano', imported: 'Zaimportowano', no3d: 'Widok 3D niedostępny offline (brak Three.js)',
    select_hint_a: 'Dotknij pierwszy róg', select_hint_b: 'Dotknij drugi róg', select_ready: 'Zaznaczono – kopiuj lub wytnij',
    paste_hint: 'Dotknij, aby wkleić', copied: 'Skopiowano', size_warn: 'Zmiana rozmiaru wyczyści świat. Kontynuować?',
    err_import: 'Błąd importu', facing: 'Kierunek', speed: 'Prędkość', empty: 'Brak zapisów', install: 'Zainstaluj',
    clear_all: 'Wyczyść świat', daylight: 'Czujnik światła', held: 'Wybrano',
  },
  en: {
    app: 'Redstone Studio', mode_place: 'Place', mode_remove: 'Remove', mode_interact: 'Interact', mode_select: 'Select',
    rotate: 'Rotate', palette: 'Palette', undo: 'Undo', redo: 'Redo', more: 'Menu', layer: 'Layer',
    view2d: '2D', view3d: '3D', play: 'Play', pause: 'Pause', step: 'Step', ticks: 'Ticks', slice: 'Slice',
    tab_redstone: 'Redstone', tab_power: 'Power', tab_wool: 'Wool', tab_solid: 'Solid', tab_other: 'Other',
    clear_layer: 'Clear layer', copy: 'Copy', cut: 'Cut', paste: 'Paste', cancel: 'Cancel', close: 'Close',
    save: 'Save', load: 'Load', delete: 'Delete', export: 'Export JSON', import: 'Import JSON', settings: 'Settings',
    slots: 'Saves', slot_name: 'Save name', grid_size: 'Grid size', apply: 'Apply', language: 'Language',
    debug: 'Debug', new_world: 'New world', overflow: 'Update budget exceeded – simulation paused',
    saved: 'Saved', loaded: 'Loaded', imported: 'Imported', no3d: '3D view unavailable offline (Three.js not cached)',
    select_hint_a: 'Tap the first corner', select_hint_b: 'Tap the second corner', select_ready: 'Selected – copy or cut',
    paste_hint: 'Tap to paste', copied: 'Copied', size_warn: 'Resizing clears the world. Continue?',
    err_import: 'Import error', facing: 'Facing', speed: 'Speed', empty: 'No saves', install: 'Install',
    clear_all: 'Clear world', daylight: 'Daylight sensor', held: 'Selected',
  },
};
const BLOCK_NAMES_PL = {
  air: 'Powietrze', stone: 'Kamień', glass: 'Szkło', obsidian: 'Obsydian', redstone_block: 'Blok redstone',
  redstone_torch: 'Pochodnia', lever: 'Dźwignia', stone_button: 'Przycisk (kamień)', wooden_button: 'Przycisk (drewno)',
  stone_plate: 'Płyta (kamień)', wooden_plate: 'Płyta (drewno)', daylight_sensor: 'Czujnik światła', target: 'Tarcza',
  redstone_dust: 'Pył redstone', repeater: 'Przekaźnik', comparator: 'Komparator', redstone_lamp: 'Lampa',
  observer: 'Obserwator', piston: 'Tłok', sticky_piston: 'Lepki tłok', piston_head: 'Głowica tłoka', dropper: 'Podajnik',
  dispenser: 'Dozownik', hopper: 'Lej', note_block: 'Blok nutowy', tnt: 'TNT', iron_door: 'Żelazne drzwi',
  iron_trapdoor: 'Żelazny właz', fence_gate: 'Furtka',
};
const WOOL_PL = ['biała', 'pomarańczowa', 'karmazynowa', 'jasnoniebieska', 'żółta', 'limonkowa', 'różowa', 'szara',
  'jasnoszara', 'turkusowa', 'fioletowa', 'niebieska', 'brązowa', 'zielona', 'czerwona', 'czarna'];

let lang = 'pl';
export const getLang = () => lang;
export function setLang(l) { if (DICT[l]) lang = l; }
export function t(key) { return (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key; }

export function blockName(b) {
  if (lang === 'en') return b.name.replace(/_/g, ' ');
  if (b.wool) return 'Wełna ' + WOOL_PL[b.id - 4];
  return BLOCK_NAMES_PL[b.name] || b.name;
}
