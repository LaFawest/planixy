import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useUI } from './UIContext'
import { useProjekte } from './ProjectsContext'
import { vergibRaumId } from './idZaehler'
import {
  raumformPolygon, boundingBox, innenPolygone,
  rechteckInPolygon as istRechteckInPolygon,
  streckeInPolygon as istStreckeInPolygon,
  snappeWandElement, platziereAufWandSegment, naechsteFreieEcke, snappeAnFreieKante,
} from '../raumPolygon'
import { DEFAULT_RAUM_DESIGN, WAND_DICKE_PX, erzeugeRaum } from '../constants'

const RoomsContext = createContext(null)

// Felder, die eckpunkte beeinflussen — bei jeder Änderung an einem davon muss eckpunkte über
// raumformPolygon() neu erzeugt werden, damit es nicht mit dem Rest der Formfelder auseinanderläuft.
const FORM_FELDER = ['breite', 'tiefe', 'raumForm', 'aussparungBreite', 'aussparungTiefe', 'ausrichtung']

// Ermittelt für ein Möbelstück eine Position, die vollständig in grenzeEckpunkte liegt —
// dieselbe dreistufige Klemmung wie bisher (unverändert, falls noch gültig / Bounding-Box-
// Klemmung / naechsteFreieEcke als Fallback für eine Aussparung), aber ohne Rücksicht auf andere
// Möbelstücke — reine Raumgeometrie, siehe moebelReparieren für die Kollisionsprüfung danach.
// null, wenn selbst naechsteFreieEcke keinen Platz findet (Möbelstück größer als jede Nische).
function polygonPosition(item, boundW, boundH, grenzeEckpunkte, grenzStart, grenzB, grenzT) {
  if (istRechteckInPolygon(item.left, item.top, boundW, boundH, grenzeEckpunkte)) {
    return { left: item.left, top: item.top }
  }
  const left = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, item.left))
  const top = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, item.top))
  if (istRechteckInPolygon(left, top, boundW, boundH, grenzeEckpunkte)) return { left, top }
  return naechsteFreieEcke(boundW, boundH, grenzeEckpunkte, grenzStart, grenzB, grenzT)
}

// Klemmt ein Möbelstück in die neue Innenfläche (grenzeEckpunkte), wenn es nach einer
// Formänderung nicht mehr vollständig hineinpasst (polygonPosition), UND snapt es bei einer
// Kollision mit einem bereits in diesem Durchlauf reparierten Möbelstück (`bereitsPlatziert`) an
// dessen nächstgelegene freie Kante (snappeAnFreieKante, raumPolygon.js — dieselbe Funktion wie
// beim interaktiven Ziehen in FurnitureContext.jsx). Ohne diese Prüfung könnten zwei Möbelstücke,
// die unabhängig voneinander an dieselbe (jetzt einzige verbliebene) Stelle geklemmt werden,
// exakt übereinander landen. Elektrogeräte stehen bewusst auf anderen Möbelstücken (siehe
// FurnitureContext.jsx) und bleiben deshalb von der Kollisionsprüfung UND von
// `bereitsPlatziert` ausgenommen (mutiert das Array als Sammel-Nebeneffekt für den Aufrufer).
// Setzt `ungueltig: true`, wenn selbst das Snapping keine freie, im Polygon liegende Position
// findet — die Position bleibt dann unverändert stehen (nicht an eine geratene Stelle springen),
// aber sichtbar markiert (Canvas2D.jsx), damit der Nutzer manuell nachjustiert.
function moebelReparieren(item, bereitsPlatziert, grenzeEckpunkte, grenzStart, grenzB, grenzT) {
  const w = item.origWidth || item.width
  const h = item.origHeight || item.height
  const rad = (item.rotation || 0) * Math.PI / 180
  const boundW = w * Math.abs(Math.cos(rad)) + h * Math.abs(Math.sin(rad))
  const boundH = w * Math.abs(Math.sin(rad)) + h * Math.abs(Math.cos(rad))
  const istElektro = item.kategorie === 'Elektrogeräte'

  const kandidat = polygonPosition(item, boundW, boundH, grenzeEckpunkte, grenzStart, grenzB, grenzT)
  if (!kandidat) return { ...item, ungueltig: true }

  const position = istElektro
    ? kandidat
    : snappeAnFreieKante(kandidat, boundW, boundH, bereitsPlatziert, grenzeEckpunkte, grenzStart, grenzB, grenzT)

  if (!position) {
    bereitsPlatziert.push({ left: kandidat.left, top: kandidat.top, breite: boundW, hoehe: boundH })
    return { ...item, left: kandidat.left, top: kandidat.top, ungueltig: true }
  }
  if (!istElektro) bereitsPlatziert.push({ left: position.left, top: position.top, breite: boundW, hoehe: boundH })
  return { ...item, left: position.left, top: position.top, ungueltig: false }
}

// Hält ein Fenster/Tür-Element nach Möglichkeit auf seinem bisherigen Wandsegment
// (platziereAufWandSegment) — eine Formänderung verschiebt oft nur die Segment-Endpunkte, ohne
// dass die Wand, an der das Element hängt, eine andere sein sollte. Erst wenn dieses Segment
// nicht mehr existiert oder das Element nicht mehr darauf passt (z.B. weil eine Aussparung genau
// diese Wand verkürzt hat), wird komplett neu auf die nächstgelegene Kante gesnappt
// (snappeWandElement) — sonst würde jede Größenänderung Fenster/Türen unnötig auf eine andere
// Wand springen lassen, nur weil ihre alte Pixelposition zufällig näher an einer anderen Wand
// der neuen Kontur liegt. eckpunkte muss innenEckpunkte sein (Wandinnenkante), analog zu
// FurnitureContext.jsx — sonst landet das Element nach der Reparatur neben statt in der Wand.
function wandElementReparieren(item, innenEckpunkte, wandDicke) {
  const beibehalten = platziereAufWandSegment(item.wandSegment, item.wandPosition, item.width, item.height, innenEckpunkte, wandDicke)
  if (beibehalten) return { ...item, ...beibehalten }
  const cx = item.left + item.width / 2
  const cy = item.top + item.height / 2
  return { ...item, ...snappeWandElement(cx, cy, item.width, item.height, innenEckpunkte, wandDicke) }
}

// Analog zu moebelReparieren, für Trennwände (Schritt 6) — dieselbe Bounding-Box-Klemmung wie
// beim Ziehen der Endpunkte (TrennwandContext.jsx), einmalig statt interaktiv.
function trennwandReparieren(wand, innenEckpunkte, innenB, innenT) {
  if (istStreckeInPolygon({ x: wand.x1, y: wand.y1 }, { x: wand.x2, y: wand.y2 }, innenEckpunkte)) return wand
  const x1 = Math.max(0, Math.min(innenB, wand.x1))
  const y1 = Math.max(0, Math.min(innenT, wand.y1))
  const x2 = Math.max(0, Math.min(innenB, wand.x2))
  const y2 = Math.max(0, Math.min(innenT, wand.y2))
  return istStreckeInPolygon({ x: x1, y: y1 }, { x: x2, y: y2 }, innenEckpunkte) ? { ...wand, x1, y1, x2, y2 } : wand
}

export function RoomsProvider({ children }) {
  const { setRaumPanelOffen } = useUI()
  const { activeProject, activeProjectId, updateProjekt } = useProjekte()
  const [activeRoomId, setActiveRoomId] = useState(() => activeProject?.raeume?.[0]?.id ?? 1)

  // Beim Wechsel des Projekts (noch keine UI dafür) auf dessen ersten Raum springen,
  // aber NICHT bei jeder Raum-Änderung innerhalb desselben Projekts neu auswählen.
  useEffect(() => {
    setActiveRoomId(activeProject?.raeume?.[0]?.id ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur an activeProjectId gekoppelt, nicht an activeProject.raeume
  }, [activeProjectId])

  const rooms = useMemo(() => activeProject?.raeume || [], [activeProject])
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]

  const updateRoom = useCallback((id, changes) => {
    const neueRaeume = (activeProject?.raeume || []).map(r => {
      if (r.id !== id) return r
      const aktualisiert = { ...r, ...changes }
      // raumForm/breite/tiefe/aussparungBreite/aussparungTiefe/ausrichtung sind die Quelle der
      // Wahrheit für die Raumform — eckpunkte muss bei jeder Änderung mitgezogen werden, damit
      // beide nicht auseinanderlaufen, sobald ein Verbraucher eckpunkte liest.
      if (FORM_FELDER.some(feld => feld in changes)) {
        aktualisiert.eckpunkte = raumformPolygon(aktualisiert)
      }
      return aktualisiert
    })
    updateProjekt(activeProjectId, { raeume: neueRaeume })
  }, [updateProjekt, activeProjectId, activeProject])

  // Justiert Möbel, Trennwände und Fenster/Türen eines Raums neu, damit sie in dessen aktuelle
  // eckpunkte passen — nötig, weil eine Größen-/Formänderung sonst Inhalte außerhalb der neuen
  // Wände stehen lassen würde (bisher schon so bei jeder Rechteck-Verkleinerung, siehe Analyse
  // 9b-2). Wird bewusst NICHT bei jeder updateRoom-Änderung automatisch mitgezogen, sondern
  // gezielt vom Aufrufer angestoßen, wenn eine Formänderung "fertig" ist — bei Breite/Tiefe also
  // erst beim Verlassen des Zahlenfelds (RaumSchritt.jsx, onBlur), nicht bei jedem Tastendruck.
  // Sonst würde z.B. das Eintippen von "12" kurzzeitig einen 1m-Raum durchlaufen, der beim
  // sofortigen Klemmen alle Möbel in die Ecke schieben würde, obwohl der Raum am Ende viel
  // größer ist. Rechnet dieselbe Geometrie wie useRaumGeometrie.js, aber hook-frei (RoomsContext
  // kann useRaumGeometrie nicht aufrufen, das würde useDesign voraussetzen, das seinerseits auf
  // RoomsContext aufbaut).
  //
  // `changes` (optional) wird VOR der Neuberechnung angewandt, im selben Durchlauf wie eckpunkte
  // und die Reparatur — das ist für die Formauswahl/Ausrichtungs-Kacheln (Schritt 9b-3) nötig:
  // ein Klick dort ändert raumForm/ausrichtung UND soll sofort nachjustieren, aber zwei getrennte
  // Aufrufe (erst updateRoom, dann nachjustiereRaum) würden auf demselben veralteten activeProject
  // arbeiten, solange React dazwischen nicht neu gerendert hat — nachjustiereRaum sähe dann noch
  // die alte Form. Bei Breite/Tiefe bleibt es dagegen bei zwei Schritten (siehe RaumSchritt.jsx):
  // die einzelnen Tastendrücke laufen weiter über updateRoom (live, ohne Reparatur), erst der
  // abschließende Blur ruft nachjustiereRaum ohne changes auf.
  const nachjustiereRaum = useCallback((id, changes = {}) => {
    const neueRaeume = (activeProject?.raeume || []).map(raumOhneAenderung => {
      if (raumOhneAenderung.id !== id) return raumOhneAenderung
      const raum = { ...raumOhneAenderung, ...changes }
      if (FORM_FELDER.some(feld => feld in changes)) {
        raum.eckpunkte = raumformPolygon(raum)
      }

      const polygonPx = raum.eckpunkte.map(p => ({ x: p.x * 60, y: p.y * 60 }))
      const box = boundingBox(polygonPx)
      const wandDicke = WAND_DICKE_PX
      const innenB = box.breite - wandDicke * 2
      const innenT = box.tiefe - wandDicke * 2
      const fussleisteBreite = (raum.fussleiste ?? DEFAULT_RAUM_DESIGN.fussleiste) ? 8 : 0
      const grenzB = innenB - fussleisteBreite * 2
      const grenzT = innenT - fussleisteBreite * 2
      const grenzStart = fussleisteBreite
      const { grenzeEckpunkte, innenEckpunkte } = innenPolygone(polygonPx, wandDicke, fussleisteBreite)

      // Sammelt die Bounding-Boxen der schon in diesem Durchlauf reparierten Möbelstücke —
      // moebelReparieren braucht sie, um neu geklemmte Kollisionen untereinander aufzulösen
      // (siehe dort). Muss dieselbe Reihenfolge wie raum.furniture durchlaufen, damit spätere
      // Möbelstücke den bereits reparierten früheren ausweichen, nicht umgekehrt.
      const bereitsPlatziert = []
      const furniture = (raum.furniture || []).map(item => item.istWandElement
        ? wandElementReparieren(item, innenEckpunkte, wandDicke)
        : moebelReparieren(item, bereitsPlatziert, grenzeEckpunkte, grenzStart, grenzB, grenzT))
      const trennwaende = (raum.trennwaende || []).map(wand => trennwandReparieren(wand, innenEckpunkte, innenB, innenT))

      return { ...raum, furniture, trennwaende }
    })
    updateProjekt(activeProjectId, { raeume: neueRaeume })
  }, [updateProjekt, activeProjectId, activeProject])

  const addRoom = useCallback(() => {
    const raumId = vergibRaumId()
    // Default-Name aus der Position in der Raumliste, nicht aus raumId (die ist seit der
    // Umstellung auf crypto.randomUUID() ein UUID-String, kein lesbarer Zähler mehr).
    const raumNummer = (activeProject?.raeume?.length || 0) + 1
    const newRoom = erzeugeRaum({ id: raumId, name: `Raum ${raumNummer}` })
    const neueRaeume = [...(activeProject?.raeume || []), newRoom]
    updateProjekt(activeProjectId, { raeume: neueRaeume })
    setActiveRoomId(newRoom.id)
    setRaumPanelOffen(true)
  }, [updateProjekt, activeProjectId, activeProject, setRaumPanelOffen])

  const deleteRoom = useCallback((id) => {
    const raeume = activeProject?.raeume || []
    if (raeume.length === 1) return
    const remaining = raeume.filter(r => r.id !== id)
    updateProjekt(activeProjectId, { raeume: remaining })
    if (activeRoomId === id) setActiveRoomId(remaining[0].id)
  }, [updateProjekt, activeProjectId, activeProject, activeRoomId])

  const waehleRaum = useCallback((id) => {
    if (activeRoomId === id) {
      setRaumPanelOffen(offen => !offen)
    } else {
      setActiveRoomId(id)
      setRaumPanelOffen(true)
    }
  }, [activeRoomId, setRaumPanelOffen])

  const value = useMemo(() => ({
    rooms, activeRoomId, activeRoom,
    setActiveRoomId, updateRoom, nachjustiereRaum, addRoom, deleteRoom, waehleRaum,
  }), [rooms, activeRoomId, activeRoom, updateRoom, nachjustiereRaum, addRoom, deleteRoom, waehleRaum])

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useRooms() {
  return useContext(RoomsContext)
}
