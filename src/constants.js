import { raumformPolygon } from './raumPolygon'

export const furnitureLibrary = [
  { name: 'Sofa 2-Sitzer',  kategorie: 'Wohnen',     width: 100, height: 52,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Sofa 3-Sitzer',  kategorie: 'Wohnen',     width: 140, height: 55,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Ecksofa',        kategorie: 'Wohnen',     width: 160, height: 100, color: '#B5D4F4', border: '#378ADD' },
  { name: 'Sessel',         kategorie: 'Wohnen',     width: 50,  height: 50,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Couchtisch',     kategorie: 'Wohnen',     width: 64,  height: 40,  color: '#C0DD97', border: '#639922' },
  { name: 'TV',             kategorie: 'Elektrogeräte', width: 80,  height: 24,  color: '#D3D1C7', border: '#444441' },
  { name: 'TV-Board',       kategorie: 'Wohnen',     width: 100, height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Esstisch',       kategorie: 'Wohnen',     width: 80,  height: 60,  color: '#C0DD97', border: '#639922' },
  { name: 'Essstuhl',       kategorie: 'Wohnen',     width: 32,  height: 32,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Vitrine',        kategorie: 'Wohnen',     width: 50,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Sideboard',      kategorie: 'Wohnen',     width: 90,  height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Bücherregal',    kategorie: 'Wohnen',     width: 60,  height: 24,  color: '#FAC775', border: '#BA7517' },
  { name: 'Sofa 1-Sitzer',  kategorie: 'Wohnen',     width: 60,  height: 52,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Barhocker',      kategorie: 'Wohnen',     width: 28,  height: 28,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Sitzbank',       kategorie: 'Wohnen',     width: 90,  height: 35,  color: '#D3D1C7', border: '#888780' },
  { name: 'Einzelbett',     kategorie: 'Schlafen',   width: 70,  height: 110, color: '#F5C4B3', border: '#D85A30' },
  { name: 'Doppelbett',     kategorie: 'Schlafen',   width: 110, height: 120, color: '#F5C4B3', border: '#D85A30' },
  { name: 'Boxspringbett',  kategorie: 'Schlafen',   width: 120, height: 130, color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Kleiderschrank', kategorie: 'Schlafen',   width: 90,  height: 50,  color: '#F5C4B3', border: '#D85A30' },
  { name: 'Nachttisch',     kategorie: 'Schlafen',   width: 36,  height: 36,  color: '#FAC775', border: '#BA7517' },
  { name: 'Kommode',        kategorie: 'Schlafen',   width: 60,  height: 36,  color: '#D3D1C7', border: '#888780' },
  { name: 'Spiegel',        kategorie: 'Schlafen',   width: 30,  height: 60,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Hocker',         kategorie: 'Schlafen',   width: 36,  height: 36,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Schminktisch',   kategorie: 'Schlafen',   width: 70,  height: 40,  color: '#FAC775', border: '#BA7517' },
  { name: 'Bettbank',       kategorie: 'Schlafen',   width: 90,  height: 35,  color: '#F5C4B3', border: '#D85A30' },
  { name: 'Schreibtisch',   kategorie: 'Büro',       width: 80,  height: 44,  color: '#D3D1C7', border: '#888780' },
  { name: 'Bürostuhl',      kategorie: 'Büro',       width: 36,  height: 36,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Regal',          kategorie: 'Büro',       width: 60,  height: 24,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Aktenschrank',   kategorie: 'Büro',       width: 50,  height: 36,  color: '#D3D1C7', border: '#444441' },
  { name: 'Drucker',        kategorie: 'Büro',       width: 40,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Monitor',        kategorie: 'Büro',       width: 40,  height: 16,  color: '#444441', border: '#2C2C2A' },
  { name: 'Rollcontainer',  kategorie: 'Büro',       width: 40,  height: 45,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Konferenztisch', kategorie: 'Büro',       width: 160, height: 90,  color: '#D3D1C7', border: '#888780' },
  { name: 'Herd',           kategorie: 'Küche',      width: 60,  height: 60,  color: '#D3D1C7', border: '#444441' },
  { name: 'Kühlschrank',    kategorie: 'Küche',      width: 40,  height: 55,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Spüle',          kategorie: 'Küche',      width: 60,  height: 44,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'Geschirrspüler', kategorie: 'Küche',      width: 44,  height: 44,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Kücheninsel',    kategorie: 'Küche',      width: 100, height: 60,  color: '#C0DD97', border: '#639922' },
  { name: 'Unterschrank',   kategorie: 'Küche',      width: 60,  height: 36,  color: '#D3D1C7', border: '#888780' },
  { name: 'Oberschrank',    kategorie: 'Küche',      width: 60,  height: 24,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Mikrowelle',     kategorie: 'Küche',      width: 36,  height: 28,  color: '#D3D1C7', border: '#444441' },
  { name: 'Backofen',       kategorie: 'Küche',      width: 60,  height: 60,  color: '#D3D1C7', border: '#444441' },
  { name: 'Dunstabzugshaube', kategorie: 'Küche',    width: 60,  height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Badewanne',      kategorie: 'Badezimmer', width: 80,  height: 40,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Dusche',         kategorie: 'Badezimmer', width: 60,  height: 60,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'WC',             kategorie: 'Badezimmer', width: 36,  height: 48,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Waschbecken',    kategorie: 'Badezimmer', width: 44,  height: 36,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Badschrank',     kategorie: 'Badezimmer', width: 50,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Handtuchhalter', kategorie: 'Badezimmer', width: 30,  height: 10,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Waschmaschine',  kategorie: 'Badezimmer', width: 44,  height: 44,  color: '#D3D1C7', border: '#888780' },
  { name: 'Duschkabine Eck', kategorie: 'Badezimmer', width: 90, height: 90,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'Bidet',          kategorie: 'Badezimmer', width: 36,  height: 48,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Pflanze',        kategorie: 'Deko',       width: 30,  height: 30,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Großpflanze',    kategorie: 'Deko',       width: 44,  height: 44,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Lampe',          kategorie: 'Deko',       width: 32,  height: 32,  color: '#FAC775', border: '#BA7517' },
  { name: 'Stehlampe',      kategorie: 'Deko',       width: 20,  height: 20,  color: '#FAC775', border: '#BA7517' },
  { name: 'Teppich klein',  kategorie: 'Deko',       width: 80,  height: 60,  color: '#F4C0D1', border: '#993556' },
  { name: 'Teppich groß',   kategorie: 'Deko',       width: 140, height: 100, color: '#F4C0D1', border: '#993556' },
  { name: 'Bild',           kategorie: 'Deko',       width: 40,  height: 30,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Kamin',          kategorie: 'Deko',       width: 80,  height: 36,  color: '#F5C4B3', border: '#993C1D' },
  { name: 'Vase',           kategorie: 'Deko',       width: 18,  height: 18,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Kerzenständer',  kategorie: 'Deko',       width: 14,  height: 14,  color: '#FAC775', border: '#BA7517' },
  { name: 'Wanduhr',        kategorie: 'Deko',       width: 30,  height: 6,   color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Kissen',         kategorie: 'Deko',       width: 35,  height: 35,  color: '#F4C0D1', border: '#993556' },
  { name: 'Globus',         kategorie: 'Deko',       width: 28,  height: 28,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'Skulptur',       kategorie: 'Deko',       width: 25,  height: 25,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Kaktus',         kategorie: 'Deko',       width: 22,  height: 22,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Lichterkette',   kategorie: 'Deko',       width: 40,  height: 10,  color: '#FAC775', border: '#BA7517' },
  { name: 'Deckenlampe',    kategorie: 'Deko',       width: 35,  height: 35,  color: '#FAC775', border: '#BA7517' },
  { name: 'Pendelleuchte',  kategorie: 'Deko',       width: 25,  height: 25,  color: '#FAC775', border: '#BA7517' },
  { name: 'Wandleuchte',    kategorie: 'Deko',       width: 20,  height: 10,  color: '#FAC775', border: '#BA7517' },
  { name: 'Kronleuchter',   kategorie: 'Deko',       width: 45,  height: 45,  color: '#FAC775', border: '#BA7517' },
  { name: 'Tischlampe',     kategorie: 'Deko',       width: 18,  height: 18,  color: '#FAC775', border: '#BA7517' },
  { name: 'Lautsprecher',   kategorie: 'Elektrogeräte', width: 20, height: 20, color: '#E8E6E0', border: '#444441' },
  { name: 'Spielekonsole',  kategorie: 'Elektrogeräte', width: 34, height: 24, color: '#E8E6E0', border: '#444441' },
  { name: 'Laptop',         kategorie: 'Elektrogeräte', width: 34, height: 24, color: '#E8E6E0', border: '#444441' },
  { name: 'Router',         kategorie: 'Elektrogeräte', width: 18, height: 10, color: '#E8E6E0', border: '#444441' },
  { name: 'Toaster',        kategorie: 'Elektrogeräte', width: 28, height: 18, color: '#E8E6E0', border: '#444441' },
  { name: 'Wasserkocher',   kategorie: 'Elektrogeräte', width: 20, height: 20, color: '#E8E6E0', border: '#444441' },
  { name: 'Kaffeemaschine', kategorie: 'Elektrogeräte', width: 30, height: 24, color: '#E8E6E0', border: '#444441' },
  { name: 'Ventilator',     kategorie: 'Elektrogeräte', width: 24, height: 24, color: '#E8E6E0', border: '#444441' },
]

export const kategorien = ['Alle', 'Wohnen', 'Schlafen', 'Büro', 'Küche', 'Badezimmer', 'Deko', 'Elektrogeräte', 'Fenster & Türen']
export const kategorieFarben = {
  'Wohnen':          { bg: '#E6F1FB', color: '#185FA5' },
  'Schlafen':        { bg: '#FAECE7', color: '#993C1D' },
  'Büro':            { bg: '#F1EFE8', color: '#5F5E5A' },
  'Küche':           { bg: '#EAF3DE', color: '#3B6D11' },
  'Badezimmer':      { bg: '#E1F5EE', color: '#0F6E56' },
  'Deko':            { bg: '#FBEAF0', color: '#993556' },
  'Elektrogeräte':   { bg: '#EAEAEA', color: '#444441' },
  'Fenster & Türen': { bg: '#E6F1FB', color: '#185FA5' },
}
export const wandElemente = [
  { name: 'Tür',           typ: 'tuer',    width: 40, height: 12, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Drehtür',       typ: 'tuer',    width: 44, height: 12, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Schiebetür',    typ: 'tuer',    width: 50, height: 10, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Fenster klein', typ: 'fenster', width: 40, height: 10, color: '#E6F4FB', border: '#185FA5' },
  { name: 'Fenster groß',  typ: 'fenster', width: 70, height: 10, color: '#E6F4FB', border: '#185FA5' },
  { name: 'Balkontür',     typ: 'tuer',    width: 44, height: 12, color: '#FFF8E6', border: '#BA7517' },
]
export const alleKatalogItems = [...furnitureLibrary, ...wandElemente.map(w => ({ ...w, kategorie: 'Fenster & Türen' }))]

export const bodenBelaege = [
  { name: 'Standard', klasse: 'boden-standard', icon: '⬜' },
  { name: 'Parkett',  klasse: 'boden-parkett',  icon: '🪵' },
  { name: 'Laminat',  klasse: 'boden-laminat',  icon: '📋' },
  { name: 'Fliesen',  klasse: 'boden-fliesen',  icon: '🔲' },
  { name: 'Teppich',  klasse: 'boden-teppich',  icon: '🟪' },
  { name: 'Beton',    klasse: 'boden-beton',     icon: '🩶' },
  { name: 'Fischgrät', klasse: 'boden-fischgraet', icon: '🟫' },
  { name: 'Schachbrett', klasse: 'boden-schachbrett', icon: '⬛' },
  { name: 'Marmor',   klasse: 'boden-marmor',    icon: '⚪' },
  { name: 'Kork',     klasse: 'boden-kork',      icon: '🌰' },
  { name: 'Schiefer', klasse: 'boden-schiefer',  icon: '🌑' },
]
export const wandFarben = [
  { name: 'Weiß',       farbe: '#FFFFFF' }, { name: 'Cremeweiß',  farbe: '#F5F0E8' },
  { name: 'Hellgrau',   farbe: '#E8E6E0' }, { name: 'Grau',       farbe: '#B4B2A9' },
  { name: 'Anthrazit',  farbe: '#444441' }, { name: 'Beige',      farbe: '#E8D5B0' },
  { name: 'Sandbraun',  farbe: '#C4A882' }, { name: 'Terrakotta', farbe: '#D4856A' },
  { name: 'Altrosa',    farbe: '#E8B4B8' }, { name: 'Mintgrün',   farbe: '#A8D5C2' },
  { name: 'Salbei',     farbe: '#8FB89A' }, { name: 'Dunkelgrün', farbe: '#2D5A3D' },
  { name: 'Hellblau',   farbe: '#B8D4E8' }, { name: 'Stahlblau',  farbe: '#4A7FA5' },
  { name: 'Dunkelblau', farbe: '#1A3A5C' }, { name: 'Lavendel',   farbe: '#C4B8D4' },
  { name: 'Aubergine',  farbe: '#5C3D5C' }, { name: 'Gelb',       farbe: '#F5E6A0' },
  { name: 'Koralle',    farbe: '#E8927C' }, { name: 'Olivgrün',   farbe: '#7C8B5A' },
  { name: 'Taupe',      farbe: '#B8A99A' }, { name: 'Puderrosa',  farbe: '#F0D4D4' },
  { name: 'Petrol',     farbe: '#1F6B6B' }, { name: 'Bordeaux',   farbe: '#6B1F2A' },
  { name: 'Karamell',   farbe: '#C68B4F' }, { name: 'Graphit',    farbe: '#3A3A38' },
  { name: 'Türkis',     farbe: '#4FB8B0' }, { name: 'Zartgrün',   farbe: '#D4E8C4' },
]
export const HIMMELSRICHTUNG_NAME = { nord: 'Nord', ost: 'Ost', sued: 'Süd', west: 'West' }

// Rechteck-spezifische Übersetzung Segmentindex -> Himmelsrichtung (0 = nord, 1 = ost,
// 2 = sued, 3 = west). Wird nur noch von der historischen v4->v5-Migration in
// projekteStorage.js gebraucht, die ausschließlich Alt-Daten aus der Zeit vor Eckpunktlisten
// verarbeitet (damals gab es nur Rechtecke) — für aktuelle Wandfarben/Fenster/Türen gilt seit
// Schritt 9a stattdessen der Segmentindex direkt bzw. himmelsrichtungAusNormale() aus
// raumPolygon.js, die für jede Form funktioniert.
export const HIMMELSRICHTUNG_JE_SEGMENT = ['nord', 'ost', 'sued', 'west']

// Dicke der Außenwände in Pixel (bei 60px/m) — Basis für die nutzbare Innenfläche eines Raums
export const WAND_DICKE_PX = 8

export const RAUM_FORMEN = [
  { id: 'rechteck', name: 'Rechteck' },
  { id: 'l-form',   name: 'L-Form' },
  { id: 'u-form',   name: 'U-Form' },
]

// Reihenfolge bewusst so gewählt, dass ein 2-Spalten-Raster wie ein Kompass liest:
// Nordwest/Nordost oben, Südwest/Südost unten.
export const L_FORM_ECKEN = [
  { id: 'nordwest', name: 'Nordwest' }, { id: 'nordost', name: 'Nordost' },
  { id: 'suedwest', name: 'Südwest' },  { id: 'suedost', name: 'Südost' },
]
export const U_FORM_SEITEN = [
  { id: 'nord', name: 'Nord' }, { id: 'ost',  name: 'Ost' },
  { id: 'sued', name: 'Süd' },  { id: 'west', name: 'West' },
]

// Mindest-Schenkelbreite (Meter), auf die die Aussparungsfelder im Raum-Schritt eine L-/U-Form
// klemmen — deutlich oberhalb der harten geometrischen Kollaps-Schwelle aus versetztesPolygon()
// (≈0,53 m bei Standard-Wanddicke+Fußleiste), damit deren Fehler über die UI praktisch nie
// erreichbar ist, aber als Sicherheitsnetz bestehen bleibt.
export const MIN_RAUM_SCHENKEL_M = 1

export function berechneInnenmasse(raumBreite, raumTiefe) {
  const innenBpx = raumBreite * 60 - WAND_DICKE_PX * 2
  const innenTpx = raumTiefe  * 60 - WAND_DICKE_PX * 2
  return { innenBpx, innenTpx }
}

export const DEFAULT_RAUM_DESIGN = { fussleiste: true, fussleisteFarbe: '#E0DDD8', raumHoehe: 2.5 }

// Schrittleiste des Editor-Wizards. `bald: true` markiert einen Schritt als noch nicht
// funktionsfähig — er bleibt trotzdem anklickbar (kein Zwang zur Reihenfolge).
// `hinweis` steht nur bei Schritten ohne Katalog (siehe KatalogContext.jsx) und wird dort statt
// des Möbelrasters angezeigt.
export const WIZARD_SCHRITTE = [
  { nummer: 1, label: 'Raum', hinweis: 'Hier legst du Form und Maße deines Raums fest.' },
  { nummer: 2, label: 'Farben & Boden', hinweis: 'Hier wählst du Wandfarbe und Bodenbelag für den Raum.' },
  { nummer: 3, label: 'Fenster & Türen' },
  { nummer: 4, label: 'Licht', bald: true, hinweis: 'Beleuchtung ist noch nicht verfügbar und folgt in einer späteren Phase.' },
  { nummer: 5, label: 'Möbel & Deko' },
]
export const DEFAULT_WIZARD_SCHRITT = WIZARD_SCHRITTE[0].nummer

// Erlaubte Felder für erzeugeRaum() — id/name sind Pflicht (jeder Aufrufer muss sie explizit
// mitgeben, dafür gibt es keinen sinnvollen Default), alles andere ist optional und bekommt
// einen Default. Eine unbekannte Angabe (Tippfehler, ein Feld das erzeugeRaum nicht kennt) oder
// eine fehlende Pflichtangabe wirft absichtlich einen Fehler, statt einen unvollständigen Raum
// still durchzulassen — genau das war die Ursache des weiße-Seite-Fehlers: ein Aufrufer hatte
// raumForm/eckpunkte vergessen, und niemand hat es bemerkt, bis die App beim Rendern abstürzte.
const RAUM_PFLICHTFELDER = ['id', 'name']
const RAUM_OPTIONALE_FELDER = [
  'raumForm', 'breite', 'tiefe', 'aussparungBreite', 'aussparungTiefe', 'ausrichtung',
  'eckpunkte', 'furniture', 'fussleiste', 'fussleisteFarbe', 'raumHoehe', 'wizardSchritt',
]
const RAUM_FELDER = new Set([...RAUM_PFLICHTFELDER, ...RAUM_OPTIONALE_FELDER])

// Einzige Stelle, die einen vollständigen, neuen Raum erzeugt — genutzt von initialRooms hier,
// RoomsContext.jsx (addRoom) und ProjekteListeContext.jsx (addProjekt). Defaults werden zuerst
// gesetzt, `felder` überschreibt sie; eckpunkte wird zuletzt aus dem fertigen Raum berechnet
// (raumformPolygon), außer der Aufrufer hat schon welche mitgegeben.
export function erzeugeRaum(felder = {}) {
  const unbekannt = Object.keys(felder).filter(feld => !RAUM_FELDER.has(feld))
  if (unbekannt.length > 0) {
    throw new Error(`erzeugeRaum: unbekannte Felder: ${unbekannt.join(', ')}`)
  }
  const fehlend = RAUM_PFLICHTFELDER.filter(feld => felder[feld] === undefined)
  if (fehlend.length > 0) {
    throw new Error(`erzeugeRaum: Pflichtfelder fehlen: ${fehlend.join(', ')}`)
  }
  const raum = {
    raumForm: 'rechteck',
    breite: 5,
    tiefe: 4,
    furniture: [],
    ...DEFAULT_RAUM_DESIGN,
    wizardSchritt: DEFAULT_WIZARD_SCHRITT,
    ...felder,
  }
  raum.eckpunkte = raum.eckpunkte || raumformPolygon(raum)
  return raum
}

export const initialRooms = [
  erzeugeRaum({ id: 1, name: 'Wohnzimmer',   breite: 6, tiefe: 5 }),
  erzeugeRaum({ id: 2, name: 'Schlafzimmer', breite: 5, tiefe: 4 }),
  erzeugeRaum({ id: 3, name: 'Küche',        breite: 4, tiefe: 3 }),
]
