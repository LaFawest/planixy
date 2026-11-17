// Ordnung des Möbelkatalogs in Schritt 4 (Katalog-Umbau Teil 2, 17.11.2026).
//
// Eine Bauart ist ein Möbeltyp aus furnitureLibrary (constants.js), etwa "Sofa 3-Sitzer". Jede
// Bauart gehört zu genau einer Familie (die Gruppen im Katalog) und zu einem oder mehreren Räumen
// (der Raumfilter davor). Die Produkte einer Bauart stehen weiter in produktempfehlungen.js;
// produktFuerKatalog unten bringt sie in eine einheitliche Form, die später auch ein Händler-Feed
// (Awin) füllen kann.
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
  'Sofa 2-Sitzer': { familie: 'sofas', raeume: ['wohnzimmer', 'kinderzimmer', 'buero'] },
  'Sofa 3-Sitzer': { familie: 'sofas', raeume: ['wohnzimmer'] },
  'Sessel': { familie: 'sofas', raeume: ['wohnzimmer', 'schlafzimmer'] },

  // Stühle, Hocker & Bänke
  'Essstuhl': { familie: 'sitzen', raeume: ['esszimmer', 'kueche', 'wohnzimmer'] },
  'Bürostuhl': { familie: 'sitzen', raeume: ['buero', 'kinderzimmer'] },
  'Barhocker': { familie: 'sitzen', raeume: ['kueche', 'esszimmer'] },
  'Hocker': { familie: 'sitzen', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer', 'flur', 'bad'] },
  'Sitzbank': { familie: 'sitzen', raeume: ['esszimmer', 'flur', 'wohnzimmer'] },
  'Bettbank': { familie: 'sitzen', raeume: ['schlafzimmer'] },

  // Tische
  'Couchtisch': { familie: 'tische', raeume: ['wohnzimmer'] },
  'Esstisch': { familie: 'tische', raeume: ['esszimmer', 'kueche', 'wohnzimmer'] },
  'Schminktisch': { familie: 'tische', raeume: ['schlafzimmer', 'bad'] },

  // Betten
  'Einzelbett': { familie: 'betten', raeume: ['schlafzimmer', 'kinderzimmer'] },
  'Doppelbett': { familie: 'betten', raeume: ['schlafzimmer'] },
  'Boxspringbett': { familie: 'betten', raeume: ['schlafzimmer'] },

  // Schränke & Kommoden
  'Kleiderschrank': { familie: 'schraenke', raeume: ['schlafzimmer', 'kinderzimmer', 'flur'] },
  'Kommode': { familie: 'schraenke', raeume: ['schlafzimmer', 'wohnzimmer', 'kinderzimmer', 'flur'] },
  'Sideboard': { familie: 'schraenke', raeume: ['wohnzimmer', 'esszimmer', 'flur'] },
  'TV-Board': { familie: 'schraenke', raeume: ['wohnzimmer', 'schlafzimmer'] },
  'Vitrine': { familie: 'schraenke', raeume: ['wohnzimmer', 'esszimmer'] },
  'Rollcontainer': { familie: 'schraenke', raeume: ['buero', 'kinderzimmer'] },
  'Nachttisch': { familie: 'schraenke', raeume: ['schlafzimmer', 'kinderzimmer'] },

  // Regale
  'Bücherregal': { familie: 'regale', raeume: ['wohnzimmer', 'buero', 'kinderzimmer'] },
  'Regal': { familie: 'regale', raeume: ALLE_RAEUME },

  // Küchenmöbel
  'Unterschrank': { familie: 'kuechenmoebel', raeume: ['kueche'] },
  'Oberschrank': { familie: 'kuechenmoebel', raeume: ['kueche'] },
  'Kücheninsel': { familie: 'kuechenmoebel', raeume: ['kueche'] },

  // Großgeräte
  'Herd': { familie: 'grossgeraete', raeume: ['kueche'] },
  'Backofen': { familie: 'grossgeraete', raeume: ['kueche'] },
  'Kühlschrank': { familie: 'grossgeraete', raeume: ['kueche'] },
  'Dunstabzugshaube': { familie: 'grossgeraete', raeume: ['kueche'] },
  'Waschmaschine': { familie: 'grossgeraete', raeume: ['bad', 'kueche', 'flur'] },

  // Küchen-Kleingeräte
  'Mikrowelle': { familie: 'kleingeraete', raeume: ['kueche'] },
  'Toaster': { familie: 'kleingeraete', raeume: ['kueche'] },
  'Wasserkocher': { familie: 'kleingeraete', raeume: ['kueche'] },
  'Kaffeemaschine': { familie: 'kleingeraete', raeume: ['kueche', 'buero'] },

  // Bad
  'Badewanne': { familie: 'bad', raeume: ['bad'] },
  'Duschkabine Eck': { familie: 'bad', raeume: ['bad'] },
  'WC': { familie: 'bad', raeume: ['bad'] },
  'Waschbecken': { familie: 'bad', raeume: ['bad'] },

  // Technik
  'TV': { familie: 'technik', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer'] },
  'Monitor': { familie: 'technik', raeume: ['buero', 'kinderzimmer'] },
  'Laptop': { familie: 'technik', raeume: ['buero', 'wohnzimmer', 'kinderzimmer'] },
  'Drucker': { familie: 'technik', raeume: ['buero'] },
  'Lautsprecher': { familie: 'technik', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer', 'buero'] },
  'Router': { familie: 'technik', raeume: ['wohnzimmer', 'buero', 'flur'] },
  'Spielekonsole': { familie: 'technik', raeume: ['wohnzimmer', 'kinderzimmer'] },
  'Ventilator': { familie: 'technik', raeume: ['wohnzimmer', 'schlafzimmer', 'buero', 'kinderzimmer'] },

  // Pflanzen
  'Pflanze': { familie: 'pflanzen', raeume: ALLE_RAEUME },
  'Großpflanze': { familie: 'pflanzen', raeume: ['wohnzimmer', 'esszimmer', 'schlafzimmer', 'buero', 'flur'] },
  'Kaktus': { familie: 'pflanzen', raeume: ['wohnzimmer', 'kueche', 'schlafzimmer', 'kinderzimmer', 'buero', 'bad'] },

  // Kamine & Öfen
  'Kamin': { familie: 'kamine', raeume: ['wohnzimmer', 'esszimmer'] },

  // Deko
  'Lampe': { familie: 'deko', untergruppe: 'stehlampen', raeume: ['wohnzimmer', 'schlafzimmer', 'buero', 'kinderzimmer'] },
  'Tischlampe': { familie: 'deko', untergruppe: 'tischlampen', raeume: ['wohnzimmer', 'schlafzimmer', 'buero', 'kinderzimmer'] },
  'Wandleuchte': { familie: 'deko', untergruppe: 'wandleuchten', raeume: ['wohnzimmer', 'esszimmer', 'schlafzimmer', 'bad', 'flur'] },
  'Spiegel': { familie: 'deko', untergruppe: 'accessoires', raeume: ['bad', 'schlafzimmer', 'flur', 'wohnzimmer'] },
  'Vase': { familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer', 'flur'] },
  'Kerzenständer': { familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer'] },
  'Wanduhr': { familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer', 'kueche', 'kinderzimmer', 'buero', 'flur'] },
  'Kissen': { familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'schlafzimmer', 'kinderzimmer'] },
  'Globus': { familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'kinderzimmer', 'buero'] },
  'Skulptur': { familie: 'deko', untergruppe: 'accessoires', raeume: ['wohnzimmer', 'esszimmer', 'flur'] },
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
