// Ordnung des Möbelkatalogs in Schritt 4 (Katalog-Umbau Teil 2, 17.11.2026).
//
// Eine Bauart ist ein Möbeltyp aus furnitureLibrary (constants.js), etwa "Sofa 3-Sitzer". Jede
// Bauart gehört zu genau einer Familie (die Gruppen im Katalog) und zu einem oder mehreren Räumen
// (der Raumfilter davor). Die Produkte einer Bauart stehen weiter in produktempfehlungen.js;
// produktFuerKatalog unten bringt sie in eine einheitliche Form, die später auch ein Händler-Feed
// (Awin) füllen kann.
//
// modellProdukt ist die id des Produkts (produktempfehlungen.js), aus dessen Foto das 3D-Modell
// gemacht wurde — belegt durch Hassans Meshy-Auftragsliste im Bilderordner (Abgleich 17.11.2026).
// Es ist das einzige Produkt der Bauart im Katalog; das Prüfskript hält das fest. Die "Lampe" ist
// trotz ihres Namens eine Nachttischlampe (lampe-01.glb) und steht deshalb unter Tischlampen.
//
// Hier stehen nur Bauarten, die in Schritt 4 vorkommen dürfen, also mit 3D-Modell (siehe
// MODELL_DATEIEN in scene/modelle.js). Leuchten aus Schritt 3 und Fenster/Türen aus Schritt 2
// gehören nicht hierher. scripts/pruefe-bauarten.mjs prüft, dass jede Bauart mit Modell hier
// eingetragen ist — kommt ein neues Modell dazu, meldet das Skript die fehlende Zuordnung.

// Reihenfolge = Reihenfolge im Katalog.
export const FAMILIEN = [
  { key: 'sofas', name: 'Sofas & Sessel' },
  { key: 'sitzen', name: 'Stühle, Hocker & Bänke' },
  { key: 'tische', name: 'Tische' },
  { key: 'betten', name: 'Betten' },
  { key: 'schraenke', name: 'Schränke & Kommoden' },
  { key: 'regale', name: 'Regale' },
  { key: 'kuechenmoebel', name: 'Küchenmöbel' },
  { key: 'grossgeraete', name: 'Großgeräte' },
  { key: 'kleingeraete', name: 'Küchen-Kleingeräte' },
  { key: 'bad', name: 'Bad' },
  { key: 'technik', name: 'Technik' },
  { key: 'pflanzen', name: 'Pflanzen' },
  { key: 'kamine', name: 'Kamine & Öfen' },
  { key: 'deko', name: 'Deko' },
]

// Untergruppen gibt es bisher nur in der Deko: Hassans Wunsch vom 17.11.2026, die Leuchten für
// Boden, Tisch und Wand dort nach Art zu ordnen, statt eine eigene Familie "Leuchten" anzulegen,
// die man mit den Deckenleuchten aus Schritt 3 verwechseln könnte.
export const UNTERGRUPPEN = {
  deko: [
    { key: 'stehlampen', name: 'Stehlampen' },
    { key: 'tischlampen', name: 'Tischlampen' },
    { key: 'wandleuchten', name: 'Wandleuchten' },
    { key: 'accessoires', name: 'Accessoires' },
  ],
}

// Reihenfolge = Reihenfolge im Raumfilter.
export const RAEUME = [
  { key: 'wohnzimmer', name: 'Wohnzimmer' },
  { key: 'esszimmer', name: 'Esszimmer' },
  { key: 'kueche', name: 'Küche' },
  { key: 'schlafzimmer', name: 'Schlafzimmer' },
  { key: 'kinderzimmer', name: 'Kinderzimmer' },
  { key: 'buero', name: 'Büro' },
  { key: 'bad', name: 'Bad' },
  { key: 'flur', name: 'Flur' },
]

const ALLE_RAEUME = RAEUME.map(r => r.key)

export const BAUARTEN = {
  // Sofas & Sessel
  'Sofa 2-Sitzer': { modellProdukt: 'sofa-2-sitzer-01', familie: 'sofas', raeume: ['wohnzimmer', 'kinderzimmer', 'buero'] },
  'Sofa 3-Sitzer': { modellProdukt: 'sofa-3-sitzer-01', familie: 'sofas', raeume: ['wohnzimmer'] },
  'Sessel': { modellProdukt: 'sessel-01', familie: 'sofas', raeume: ['wohnzimmer', 'schlafzimmer'] },

  // Stühle, Hocker & Bänke
  'Essstuhl': { modellProdukt: 'essstuhl-01', familie: 'sitzen', raeume: ['esszimmer', 'kueche', 'wohnzimmer'] },
  'Bürostuhl': { modellProdukt: 'bu-rostuhl-02', familie: 'sitzen', raeume: ['buero', 'kinderzimmer'] },
  'Barhocker': { modellProdukt: 'barhocker-01', familie: 'sitzen', raeume: ['kueche', 'esszimmer'] },
  'Hocker': { modellProdukt: 'hocker-01', familie: 'sitzen', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer', 'flur', 'bad'] },
  'Sitzbank': { modellProdukt: 'sitzbank-01', familie: 'sitzen', raeume: ['esszimmer', 'flur', 'wohnzimmer'] },
  'Bettbank': { modellProdukt: 'bettbank-01', familie: 'sitzen', raeume: ['schlafzimmer'] },

  // Tische
  'Couchtisch': { modellProdukt: 'couchtisch-01', familie: 'tische', raeume: ['wohnzimmer'] },
  'Esstisch': { modellProdukt: 'esstisch-01', familie: 'tische', raeume: ['esszimmer', 'kueche', 'wohnzimmer'] },
  'Schminktisch': { modellProdukt: 'schminktisch-01', familie: 'tische', raeume: ['schlafzimmer', 'bad'] },

  // Betten
  'Einzelbett': { modellProdukt: 'einzelbett-01', familie: 'betten', raeume: ['schlafzimmer', 'kinderzimmer'] },
  'Doppelbett': { modellProdukt: 'doppelbett-01', familie: 'betten', raeume: ['schlafzimmer'] },
  'Boxspringbett': { modellProdukt: 'boxspringbett-01', familie: 'betten', raeume: ['schlafzimmer'] },

  // Schränke & Kommoden
  'Kleiderschrank': { modellProdukt: 'kleiderschrank-03', familie: 'schraenke', raeume: ['schlafzimmer', 'kinderzimmer', 'flur'] },
  'Kommode': { modellProdukt: 'kommode-01', familie: 'schraenke', raeume: ['schlafzimmer', 'wohnzimmer', 'kinderzimmer', 'flur'] },
  'Sideboard': { modellProdukt: 'sideboard-01', familie: 'schraenke', raeume: ['wohnzimmer', 'esszimmer', 'flur'] },
  'TV-Board': { modellProdukt: 'tv-board-01', familie: 'schraenke', raeume: ['wohnzimmer', 'schlafzimmer'] },
  'Vitrine': { modellProdukt: 'vitrine-01', familie: 'schraenke', raeume: ['wohnzimmer', 'esszimmer'] },
  'Rollcontainer': { modellProdukt: 'rollcontainer-01', familie: 'schraenke', raeume: ['buero', 'kinderzimmer'] },
  'Nachttisch': { modellProdukt: 'nachttisch-01', familie: 'schraenke', raeume: ['schlafzimmer', 'kinderzimmer'] },

  // Regale
  'Bücherregal': { modellProdukt: 'bu-cherregal-01', familie: 'regale', raeume: ['wohnzimmer', 'buero', 'kinderzimmer'] },
  'Regal': { modellProdukt: 'regal-01', familie: 'regale', raeume: ALLE_RAEUME },

  // Küchenmöbel
  'Unterschrank': { modellProdukt: 'unterschrank-01', familie: 'kuechenmoebel', raeume: ['kueche'] },
  'Oberschrank': { modellProdukt: 'oberschrank-01', familie: 'kuechenmoebel', raeume: ['kueche'] },
  'Kücheninsel': { modellProdukt: 'ku-cheninsel-01', familie: 'kuechenmoebel', raeume: ['kueche'] },

  // Großgeräte
  'Herd': { modellProdukt: 'herd-02', familie: 'grossgeraete', raeume: ['kueche'] },
  'Backofen': { modellProdukt: 'backofen-01', familie: 'grossgeraete', raeume: ['kueche'] },
  'Kühlschrank': { modellProdukt: 'ku-hlschrank-01', familie: 'grossgeraete', raeume: ['kueche'] },
  'Dunstabzugshaube': { modellProdukt: 'dunstabzugshaube-01', familie: 'grossgeraete', raeume: ['kueche'] },
  'Waschmaschine': { modellProdukt: 'waschmaschine-01', familie: 'grossgeraete', raeume: ['bad', 'kueche', 'flur'] },

  // Küchen-Kleingeräte
  'Mikrowelle': { modellProdukt: 'mikrowelle-01', familie: 'kleingeraete', raeume: ['kueche'] },
  'Toaster': { modellProdukt: 'toaster-01', familie: 'kleingeraete', raeume: ['kueche'] },
  'Wasserkocher': { modellProdukt: 'wasserkocher-01', familie: 'kleingeraete', raeume: ['kueche'] },
  'Kaffeemaschine': { modellProdukt: 'kaffeemaschine-01', familie: 'kleingeraete', raeume: ['kueche', 'buero'] },

  // Bad
  'Badewanne': { modellProdukt: 'badewanne-01', familie: 'bad', raeume: ['bad'] },
  'Duschkabine Eck': { modellProdukt: 'duschkabine-eck-01', familie: 'bad', raeume: ['bad'] },
  'WC': { modellProdukt: 'wc-01', familie: 'bad', raeume: ['bad'] },
  'Waschbecken': { modellProdukt: 'waschbecken-01', familie: 'bad', raeume: ['bad'] },

  // Technik
  'TV': { modellProdukt: 'tv-03', familie: 'technik', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer'] },
  'Monitor': { modellProdukt: 'monitor-02', familie: 'technik', raeume: ['buero', 'kinderzimmer'] },
  'Laptop': { modellProdukt: 'laptop-01', familie: 'technik', raeume: ['buero', 'wohnzimmer', 'kinderzimmer'] },
  'Drucker': { modellProdukt: 'drucker-01', familie: 'technik', raeume: ['buero'] },
  'Lautsprecher': { modellProdukt: 'lautsprecher-01', familie: 'technik', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer', 'buero'] },
  'Router': { modellProdukt: 'router-01', familie: 'technik', raeume: ['wohnzimmer', 'buero', 'flur'] },
  'Spielekonsole': { modellProdukt: 'spielekonsole-01', familie: 'technik', raeume: ['wohnzimmer', 'kinderzimmer'] },
  'Ventilator': { modellProdukt: 'ventilator-01', familie: 'technik', raeume: ['wohnzimmer', 'schlafzimmer', 'buero', 'kinderzimmer'] },

  // Pflanzen
  'Pflanze': { modellProdukt: 'pflanze-01', familie: 'pflanzen', raeume: ALLE_RAEUME },
  'Großpflanze': { modellProdukt: 'grosspflanze-01', familie: 'pflanzen', raeume: ['wohnzimmer', 'esszimmer', 'schlafzimmer', 'buero', 'flur'] },
  'Kaktus': { modellProdukt: 'kaktus-01', familie: 'pflanzen', raeume: ['wohnzimmer', 'kueche', 'schlafzimmer', 'kinderzimmer', 'buero', 'bad'] },

  // Kamine & Öfen
  'Kamin': { modellProdukt: 'kamin-01', familie: 'kamine', raeume: ['wohnzimmer', 'esszimmer'] },

  // Deko
  'Lampe': { modellProdukt: 'lampe-01', familie: 'deko', untergruppe: 'tischlampen', raeume: ['wohnzimmer', 'schlafzimmer', 'buero', 'kinderzimmer'] },
  'Tischlampe': { modellProdukt: 'tischlampe-01', familie: 'deko', untergruppe: 'tischlampen', raeume: ['wohnzimmer', 'schlafzimmer', 'buero', 'kinderzimmer'] },
  'Wandleuchte': { modellProdukt: 'wandleuchte-01', familie: 'deko', untergruppe: 'wandleuchten', raeume: ['wohnzimmer', 'esszimmer', 'schlafzimmer', 'bad', 'flur'] },
  'Spiegel': { modellProdukt: 'spiegel-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['bad', 'schlafzimmer', 'flur', 'wohnzimmer'] },
  'Vase': { modellProdukt: 'vase-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer', 'flur'] },
  'Kerzenständer': { modellProdukt: 'kerzensta-nder-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer'] },
  'Wanduhr': { modellProdukt: 'wanduhr-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer', 'kueche', 'kinderzimmer', 'buero', 'flur'] },
  'Kissen': { modellProdukt: 'kissen-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer'] },
  'Globus': { modellProdukt: 'globus-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'kinderzimmer', 'buero'] },
  'Skulptur': { modellProdukt: 'skulptur-01', familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer', 'flur'] },
}

// Bauart-Eintrag oder null, wenn die Bauart (noch) nicht eingeordnet ist.
export function bauartInfo(name) {
  return BAUARTEN[name] || null
}

// Ein Produkt in der Form, die der Katalog ab Teil 3 liest. Heute kommen alle Produkte von Hand
// aus produktempfehlungen.js (quelle 'manuell'); ein Händler-Feed liefert später dieselben Felder
// mit quelle 'awin'. Fehlende Werte sind null, nie geraten.
export function produktFuerKatalog(p) {
  return {
    id: p.id,
    bauart: p.moebelName,
    quelle: p.quelle || 'manuell',
    haendler: p.shop || null,
    haendlerArtikelNr: p.asin || null,
    hersteller: p.marke || null,
    titel: p.name,
    link: p.link || null,
    bildUrl: p.bild || null,
    farbe: p.farbe || null,
    breiteCm: p.breite ?? null,
    tiefeCm: p.tiefe ?? null,
    hoeheCm: p.hoehe ?? null,
    gtin: p.gtin || null,
    // Preise werden seit dem 17.11.2026 nicht angezeigt (siehe ProduktPanel.jsx); das Feld bleibt
    // für den Feed, der sie später live und mit Abrufdatum liefert.
    preis: p.preis ?? null,
    waehrung: p.waehrung || 'EUR',
    verfuegbar: p.verfuegbar ?? null,
    aktualisiertAm: p.aktualisiertAm || null,
  }
}
