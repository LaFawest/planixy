// Shop-Verweise (18.11.2026): Links wie „Pendelleuchten bei Lampenwelt entdecken“ auf eine
// Kategorieseite eines Händlers, mit Awin-Tracking. Sie ersetzen KEINE Produktkarten: Im Katalog
// steht je Bauart weiter nur das Produkt mit eigenem 3D-Modell (modellProdukt in bauarten.js). Ein
// Verweis zeigt nur, wo es mehr davon gibt.
//
// Ziele (art + id):
//   'bauart'  — Schlüssel in BAUARTEN (data/bauarten.js), etwa 'Wandleuchte'
//   'leuchte' — Leuchtentyp aus Schritt 3, also ein Name aus furnitureLibrary (constants.js) mit
//               kategorie 'Licht', etwa 'Pendelleuchte'. Leuchten haben keine eigene id, der Name
//               ist die id.
//   'raum'    — Schlüssel in RAEUME (data/bauarten.js), etwa 'bad'
// Je Ziel sind mehrere Verweise und mehrere Händler möglich (höchstens drei je Ziel).
//
// Nur reine Links: kein Awin-MasterTag, kein Skript, kein Bild, kein clickref. So geht vor einem
// Klick keine Anfrage an awin1.com.
//
// scripts/pruefe-shopverweise.mjs prüft, dass jedes Ziel existiert, jeder Händler hier steht und
// jede url ein Awin-Link mit passender awinmid, Planixys Publisher-id und einer Zieladresse auf der
// Domain des Händlers ist.

// Händler an einer Stelle. Neue Händler (z. B. aosom, awinmid 11684; poco, awinmid 16021) kommen
// als weitere Einträge dazu. domain ist die Domain, auf die ein Verweis am Ende führen muss.
export const HAENDLER = {
  amazon: { name: 'Amazon', domain: 'amazon.de' },
  lampenwelt: { name: 'Lampenwelt', domain: 'lampenwelt.de', netzwerk: 'awin', awinmid: 7619 },
}

export const SHOP_VERWEISE = [
  // Schritt 3 „Atmosphäre“: Leuchtentypen
  {
    art: 'leuchte', id: 'Pendelleuchte', haendler: 'lampenwelt',
    text: 'Pendelleuchten bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fpendelleuchten-hangelampen',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'leuchte', id: 'Kronleuchter', haendler: 'lampenwelt',
    text: 'Kronleuchter bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fkronleuchter',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'leuchte', id: 'Deckenlampe', haendler: 'lampenwelt',
    text: 'Deckenleuchten bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fdeckenleuchten',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'leuchte', id: 'LED-Panel', haendler: 'lampenwelt',
    text: 'LED-Panels bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fdeckenleuchten%2Fled-panel',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'leuchte', id: 'LED-Streifen', haendler: 'lampenwelt',
    text: 'LED-Streifen bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Fdekoleuchten%2Fled-streifen',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'leuchte', id: 'Spot', haendler: 'lampenwelt',
    text: 'Strahler & Spots bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fstrahler-und-spots',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'leuchte', id: 'Spot-Reihe', haendler: 'lampenwelt',
    text: 'Strahler & Spots bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fstrahler-und-spots',
    geprueftAm: '2026-11-18',
  },
  {
    // Eine Spot-Reihe ist in der App eine feste Reihe von Spots; Schienensysteme sind die nächste
    // Entsprechung beim Händler und stehen deshalb als zweiter Verweis hier.
    art: 'leuchte', id: 'Spot-Reihe', haendler: 'lampenwelt',
    text: 'Schienensysteme bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fschienensysteme',
    geprueftAm: '2026-11-18',
  },

  // Schritt 4, Katalog: Bauarten (Deko, Untergruppen Tischlampen und Wandleuchten)
  {
    art: 'bauart', id: 'Tischlampe', haendler: 'lampenwelt',
    text: 'Weitere Tischlampen bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Ftischlampen',
    geprueftAm: '2026-11-18',
  },
  {
    // 'Lampe' ist eine Nachttischlampe (lampe-01) und steht ebenfalls unter Tischlampen.
    art: 'bauart', id: 'Lampe', haendler: 'lampenwelt',
    text: 'Weitere Tischlampen bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Ftischlampen',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'bauart', id: 'Wandleuchte', haendler: 'lampenwelt',
    text: 'Weitere Wandleuchten bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fwandleuchten',
    geprueftAm: '2026-11-18',
  },
  // Zurückgestellt — kommt mit Stehlampen-Modell. Die Bauart 'Stehlampe' hat noch kein 3D-Modell
  // und steht deshalb nicht in BAUARTEN; die Untergruppe deko/stehlampen ist leer und unsichtbar.
  // {
  //   art: 'bauart', id: 'Stehlampe', haendler: 'lampenwelt',
  //   text: 'Weitere Stehlampen bei Lampenwelt entdecken',
  //   url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Finnenleuchten%2Fstehlampen',
  //   geprueftAm: '2026-11-18',
  // },

  // Schritt 4, Raumfilter
  {
    art: 'raum', id: 'bad', haendler: 'lampenwelt',
    text: 'Leuchten fürs Bad bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Fraeume%2Fbad',
    geprueftAm: '2026-11-18',
  },
  {
    art: 'raum', id: 'kinderzimmer', haendler: 'lampenwelt',
    text: 'Leuchten fürs Kinderzimmer bei Lampenwelt entdecken',
    url: 'https://www.awin1.com/cread.php?awinmid=7619&awinaffid=3151150&ued=https%3A%2F%2Fwww.lampenwelt.de%2Fc%2Fraeume%2Fkinderzimmer',
    geprueftAm: '2026-11-18',
  },
]

// Alle Verweise für ein Ziel, in der Reihenfolge von SHOP_VERWEISE; leere Liste, wenn es keine gibt.
export const shopVerweiseFuer = (art, id) => SHOP_VERWEISE.filter(v => v.art === art && v.id === id)
