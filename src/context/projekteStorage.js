import { initialRooms, DEFAULT_WIZARD_SCHRITT, HIMMELSRICHTUNG_JE_SEGMENT } from '../constants'
import { migriereRaum } from './roomsStorage'
import { rechteckPolygon } from '../raumPolygon'

const STORAGE_KEY = 'planixy-rooms'
export const SCHEMA_VERSION = 7
const STANDARD_PROJEKT_NAME = 'Mein Zuhause'

const SEGMENT_JE_HIMMELSRICHTUNG = Object.fromEntries(
  HIMMELSRICHTUNG_JE_SEGMENT.map((seite, i) => [seite, i])
)

const neuesProjektObjekt = (id, raeume, name = STANDARD_PROJEKT_NAME) => {
  const jetzt = new Date().toISOString()
  return { id, name, erstelltAm: jetzt, geaendertAm: jetzt, raeume }
}

// v0 (rohes Array von Räumen, kein schemaVersion-Feld) -> v1 ({ schemaVersion: 1, rooms })
const migriereV0ZuV1 = (rohesArray) => ({
  schemaVersion: 1,
  rooms: rohesArray.map(migriereRaum),
})

// v1 -> v2: die bisher flache Raumliste wird zum ersten Projekt "Mein Zuhause"
const migriereV1ZuV2 = (v1Daten) => ({
  schemaVersion: 2,
  projekte: [neuesProjektObjekt(1, v1Daten.rooms || [])],
})

// v2 -> v3: jeder Raum bekommt einen Wizard-Schritt (Default: erster Schritt), falls noch nicht vorhanden
const migriereV2ZuV3 = (v2Daten) => ({
  schemaVersion: 3,
  projekte: (v2Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(raum => ({ wizardSchritt: DEFAULT_WIZARD_SCHRITT, ...raum })),
  })),
})

// v3 -> v4: jeder Raum bekommt eine Eckpunktliste (Randpolygon), aus breite/tiefe
// abgeleitet. breite/tiefe bleiben unverändert erhalten (weiterhin von allen bisherigen
// Verbrauchern gelesen) — das Polygon ist vorerst nur zusätzliches Fundament, noch kein
// Verbraucher liest es.
const migriereV3ZuV4 = (v3Daten) => ({
  schemaVersion: 4,
  projekte: (v3Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(raum => ({
      ...raum,
      eckpunkte: raum.eckpunkte || rechteckPolygon(raum.breite || 6, raum.tiefe || 5),
    })),
  })),
})

// v4 -> v5: Fenster/Türen (furniture-Einträge mit istWandElement) verlieren das
// Himmelsrichtungsfeld `wand` zugunsten von wandSegment (Index, siehe wandSegmente() in
// raumPolygon.js) + wandPosition (Meter, Abstand vom Segmentanfang). left/top bleiben
// unverändert die Quelle für 2D- und 3D-Rendering — am Ergebnis ändert sich nichts, nur die
// Herkunft der Himmelsrichtung wechselt vom gespeicherten String zum Segmentindex.
// Für Rechtecke ist die Zuordnung fix: Segment 0/1 (nord/ost) laufen in derselben Richtung
// wie die bisherigen left/top-Werte, Segment 2/3 (sued/west) in Gegenrichtung — dort wird
// beim Migrieren gespiegelt (raumBreite/-tiefe minus bisherige Position).
const migriereFensterTuer = (item, raumBreite, raumTiefe) => {
  if (!item.istWandElement) return item
  const { wand, ...rest } = item
  const richtung = wand || 'nord'
  const wandSegment = SEGMENT_JE_HIMMELSRICHTUNG[richtung] ?? 0
  const wandPosition = richtung === 'sued' ? raumBreite - item.left / 60
    : richtung === 'west' ? raumTiefe - item.top / 60
    : richtung === 'ost' ? item.top / 60
    : item.left / 60
  return { ...rest, wandSegment, wandPosition }
}

const migriereV4ZuV5 = (v4Daten) => ({
  schemaVersion: 5,
  projekte: (v4Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(raum => ({
      ...raum,
      furniture: (raum.furniture || []).map(item => migriereFensterTuer(item, raum.breite || 6, raum.tiefe || 5)),
    })),
  })),
})

// v5 -> v6: room.wandfarben wechselt von Himmelsrichtung-Schlüsseln (nord/ost/sued/west) auf
// Segmentindex-Schlüssel (0/1/2/...), damit Wandfarben auch bei L-/U-Formen (Schritt 9)
// funktionieren, wo ein Segmentindex keine feste Himmelsrichtung mehr hat. Alt-Daten sind
// garantiert Rechtecke (siehe HIMMELSRICHTUNG_JE_SEGMENT), daher liefert
// SEGMENT_JE_HIMMELSRICHTUNG hier eine eindeutige, verlustfreie Übersetzung. room.wandfarbe
// (Farbe für "alle Wände") bleibt unverändert.
const migriereV5ZuV6 = (v5Daten) => ({
  schemaVersion: 6,
  projekte: (v5Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(raum => {
      if (!raum.wandfarben) return raum
      const wandfarben = Object.fromEntries(
        Object.entries(raum.wandfarben).map(([seite, farbe]) => [SEGMENT_JE_HIMMELSRICHTUNG[seite] ?? 0, farbe])
      )
      return { ...raum, wandfarben }
    }),
  })),
})

// v6 -> v7: jeder Raum bekommt ein explizites raumForm-Feld ('rechteck'), Grundlage für die
// L-/U-Formen aus Schritt 9b. Alt-Daten sind alle Rechtecke, keine weiteren Felder nötig —
// aussparungBreite/aussparungTiefe/ausrichtung bleiben unbelegt und werden nur gelesen, wenn
// raumForm auf 'l-form'/'u-form' steht (siehe raumformPolygon() in raumPolygon.js).
const migriereV6ZuV7 = (v6Daten) => ({
  schemaVersion: 7,
  projekte: (v6Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(raum => ({ raumForm: 'rechteck', ...raum })),
  })),
})

// Wendet die vollständige Migrationskette (v0 -> v1 -> ... -> SCHEMA_VERSION) auf rohe Daten an,
// egal ob sie aus localStorage oder einer importierten Datei stammen (siehe projektExport.js,
// parseProjektDatei) — reine Funktion, kein localStorage-Zugriff, damit eine ältere exportierte
// Datei genau denselben Weg durchläuft wie alte localStorage-Daten. undefined, wenn die Daten
// weder ein rohes v0-Array noch ein Objekt mit erkennbarer schemaVersion sind, oder die Kette
// nicht bei SCHEMA_VERSION ankommt (unbekannte/zukünftige Version) — der Aufrufer entscheidet
// selbst über den Notfall (loadProjekte fällt auf Default-Räume zurück, der Import wirft
// stattdessen einen klaren Fehler statt still ein fremdes Projekt zu verwerfen).
export const migriereProjekteDaten = (rohDaten) => {
  let daten = rohDaten
  if (Array.isArray(daten)) {
    daten = migriereV0ZuV1(daten)
  } else if (daten === null || typeof daten !== 'object') {
    return undefined
  }
  if (daten.schemaVersion === 1) {
    daten = migriereV1ZuV2(daten)
  }
  if (daten.schemaVersion === 2) {
    daten = migriereV2ZuV3(daten)
  }
  if (daten.schemaVersion === 3) {
    daten = migriereV3ZuV4(daten)
  }
  if (daten.schemaVersion === 4) {
    daten = migriereV4ZuV5(daten)
  }
  if (daten.schemaVersion === 5) {
    daten = migriereV5ZuV6(daten)
  }
  if (daten.schemaVersion === 6) {
    daten = migriereV6ZuV7(daten)
  }
  return daten.schemaVersion === SCHEMA_VERSION ? daten.projekte : undefined
}

export const loadProjekte = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return [neuesProjektObjekt(1, initialRooms)]

  // Unbekannte/zukünftige Version oder unvollständige Hülle: defensiv auf Default-Räume zurückfallen
  return migriereProjekteDaten(JSON.parse(saved)) || [neuesProjektObjekt(1, initialRooms)]
}

export const saveProjekte = (projekte) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, projekte }))
}

export const alleRaeume = (projekte) => projekte.flatMap(p => p.raeume || [])
