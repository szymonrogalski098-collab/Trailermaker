# Engine notes – odstępstwa od Minecraft Java

## Zaimplementowane zgodnie z Javą
- Moc: dust 0-15, spadek o 1, wspinanie się po blokach (blokowane przez przewodzący blok nad niższym pyłem, szkło nie blokuje),
  schodzenie przez nieprzewodzące bloki, kształt kropka/linia (linia zasila bloki na końcach osi, kropka wszystkie 4 strony).
- Strong vs weak power: bloki przewodzące są zasilane "bezpośrednio" przez dźwignię/przycisk (na blok, do którego są przyczepione),
  pochodnię pod spodem, przekaźnik/komparator/obserwator (z przodu/wyjścia), płytę (blok pod spodem); pył zasila blok słabo
  (blok przewodzi do repeaterów/lamp/tłoków, ale nie z powrotem do innego pyłu).
- Pochodnia: opóźnienie 2 tiki gry, wypalenie przy >= 8 przełączeniach w 60 tikach (ponowne sprawdzenie po 160 tikach).
- Przekaźnik: 1-4 tiki redstone (2/4/6/8 tików gry), blokada przez boczny przekaźnik/komparator, wyjście 15 tylko do przodu,
  impuls trwa min. tyle co opóźnienie, priorytety ticków (-3/-2/-1) jak w Javie.
- Komparator: tryb porównania/odejmowania, boczne wejście (pył, blok redstone, diody), opóźnienie 2 tiki gry.
- Lampa: włącza się natychmiast, wyłącza po 4 tikach gry. Obserwator: impuls 2 tiki po zmianie stanu bloku z przodu.
- Tłok / lepki tłok: limit 12, obsydian i wysunięty tłok nieruchome, pył/pochodnie/dźwignie/przyciski/płyty są niszczone.
- Quasi-connectivity: tłok (oraz podajnik/dozownik) sprawdza zasilanie komórki powyżej i jej sąsiadów (poza dołem); do tego
  Java-owe "tłok zasilany z przodu przez silne zasilanie samego siebie".
- Kolejka scheduled tików: (czas, priorytet, kolejność dodania). Budżet 100 000 update'ów na akcję/tik -> flaga `overflow`
  i ostrzeżenie w UI zamiast zawieszenia.

## Znane odstępstwa
1. **Kolejność update'ów:** Java wykonuje neighbor updates rekurencyjnie (DFS); silnik używa kolejki FIFO (BFS), z pierścieniem
   sąsiadów W,E,D,U,N,S (z deduplikacją). Wyniki są deterministyczne, lecz dla egzotycznych układów (BUD, zero-tick, update
   suppression) kolejność może się różnić od vanilli.
2. **Pył:** zwykła propagacja per-update (bez optymalizacji per-sieć), każda zmiana mocy odświeża pierścień 2 bloków.
3. **Czasy przycisków:** wymagane "10/15" odpowiada tikom *redstone*; silnik używa wartości Javy w tikach gry:
   kamienny 20, drewniany 30.
4. **Tłoki:** ruch jest natychmiastowy (brak bloków w ruchu/animacji 2 tików), brak pchania slime/honey, brak ruchu bloków
   z przyczepionymi elementami (podpory pyłu/pochodni są niszczone przy pchnięciu). Brak szybkich impulsów 0-tick.
   Lepki tłok przy cofnięciu ciągnie jeden blok.
5. **Brak encji:** płyty naciskowe, tarcza i czujnik światła przełączane ręcznie; brak kontenerów, więc komparator
   nie odczytuje ekwipunku (tylko sygnał z pyłu/bloków).
6. **Konsumenci** (dropper, dispenser, hopper, blok nutowy, TNT, żelazne drzwi/właz, furtka): tylko flaga zasilania / otwarte.
   TNT nie wybucha. Dropper/dispenser mają quasi-connectivity; pozostali nie.
7. **Nie zaimplementowane:** tory zasilane (opcjonalne), slime/honey, lej jako blokada, ścienne/sufitowe warianty repeatera.
8. Dyskretny podkład: pustka pod warstwą Y=0 traktowana jest jako litą podłogę (pył/pochodnie można stawiać na Y=0).
9. Wycofanie wsparcia: blok wymagający podpory (pył, pochodnia, dźwignia, przekaźnik...) znika przy utracie podpory
   (bez dropu); edytor odmawia postawienia go bez podpory.
