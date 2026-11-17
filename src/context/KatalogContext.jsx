import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { alleKatalogItems, WIZARD_SCHRITTE } from '../constants'
import { darfVorkommen } from '../data/moebelFilter'
import { produkteFuerTyp, produktAufKatalogItemAnwenden, ersterVorschlag } from '../data/produktAuswahl'
import { FAMILIEN, UNTERGRUPPEN, RAEUME, BAUARTEN } from '../data/bauarten'
import { useFurniture } from './FurnitureContext'
import { useWizard } from './WizardContext'

const KatalogContext = createContext(null)

const FENSTER_TUEREN_KATEGORIE = 'Fenster & Türen'
const LICHT_KATEGORIE = 'Licht'
const FENSTER_TUEREN_SCHRITT = 2
const LICHT_SCHRITT = 3
const MOEBEL_SCHRITT = 4

// Der Katalog ist an die Wizard-Schritte gebunden, statt in jedem Schritt alles anzubieten —
// sonst könnte man schon in Schritt 1 möblieren, was den Wizard sinnlos macht. Fenster & Türen
// gehören zu Schritt 2, Leuchten zu Schritt 3, alles andere zu Schritt 4 — jeder dieser drei
// Schritte bekommt hier seine eigene Kategorie-Filterregel; Schritt 1 hat keinen Katalog.
// Schritt 4 bietet zusätzlich nur noch an, was auch wirklich als 3D-Modell erscheint. Ein Typ
// ohne Modell würde als Klötzchen im Raum stehen, und ein Klötzchen ist kein Möbelstück,
// sondern ein Platzhalter. Kommt ein neues Meshy-Modell dazu, taucht der Typ hier von selbst
// wieder auf — die Liste steht in MODELL_DATEIEN, nicht hier.
// Schritt 2 und 3 bleiben bewusst ohne diese Bedingung: Fenster, Türen und Leuchten sind
// gezeichnete Geometrie und haben nie ein Modell gehabt.
const KATEGORIE_FILTER_JE_SCHRITT = {
  [FENSTER_TUEREN_SCHRITT]: (item) => item.kategorie === FENSTER_TUEREN_KATEGORIE,
  [LICHT_SCHRITT]: (item) => item.kategorie === LICHT_KATEGORIE,
  [MOEBEL_SCHRITT]: (item) => item.kategorie !== FENSTER_TUEREN_KATEGORIE
    && item.kategorie !== LICHT_KATEGORIE
    && darfVorkommen(item),
}
const KATALOG_SCHRITTE = Object.keys(KATEGORIE_FILTER_JE_SCHRITT).map(Number)

// Eine Suchregel für den Katalog und für beide Hinweise (Raum und Schritt): Treffer im Namen der
// Bauart oder, bei Bauarten aus data/bauarten.js, im Namen ihrer Familie. s ist schon klein
// geschrieben und getrimmt; leer passt immer.
function passtZurSuche(item, s) {
  if (!s || item.name.toLowerCase().includes(s)) return true
  const info = BAUARTEN[item.name]
  const familienName = info ? FAMILIEN.find(f => f.key === info.familie)?.name || '' : ''
  return familienName.toLowerCase().includes(s)
}

export function KatalogProvider({ children }) {
  const { addFurniture, addWandElement, selectedId, setSelectedId } = useFurniture()
  const { schritt, setSchritt } = useWizard()
  // Produktwahl rechts (Katalog-Umbau Teil 4, 17.11.2026): Ein Klick auf eine Karte in Schritt 4
  // wählt am Desktop nur die Bauart; eingefügt wird erst mit dem Produkt (ProduktWahl.jsx).
  const [gewaehlteBauart, setGewaehlteBauart] = useState(null)
  // Die Produktwahl schließt, sobald man ein platziertes Möbel auswählt oder den Schritt wechselt.
  // Als Abgleich beim Rendern statt in einem Effekt (React: "Adjusting some state when a prop
  // changes"), damit die Wahl nicht erst einen Zwischenstand lang sichtbar bleibt.
  const [abgleich, setAbgleich] = useState({ selectedId, schritt })
  if (abgleich.selectedId !== selectedId || abgleich.schritt !== schritt) {
    setAbgleich({ selectedId, schritt })
    if (gewaehlteBauart !== null && (selectedId !== null || abgleich.schritt !== schritt)) setGewaehlteBauart(null)
  }
  // Raumfilter in Schritt 4 (Katalog-Umbau Teil 3, 17.11.2026) statt der früheren Kategorie-Chips:
  // 'alle' oder ein Raum-Schlüssel aus RAEUME (data/bauarten.js). Eine Bauart kann in mehreren
  // Räumen stehen.
  const [aktiverRaum, setAktiverRaum] = useState('alle')
  const [suche, setSuche] = useState('')

  const katalogSichtbar = KATALOG_SCHRITTE.includes(schritt)
  const raumAuswahlSichtbar = schritt === MOEBEL_SCHRITT

  const erreichbareItems = useMemo(() => {
    const filter = KATEGORIE_FILTER_JE_SCHRITT[schritt]
    return filter ? alleKatalogItems.filter(filter) : []
  }, [schritt])

  // Raum- und Suchfilter laufen über die Bauart, nicht über einzelne Produkte. In Schritt 4 sucht
  // die Suche zusätzlich im Familiennamen: "sofa" findet auch den Sessel, "bad" die ganze Familie
  // Bad. Bauarten, die (noch) nicht in BAUARTEN stehen, zeigt Schritt 4 nicht —
  // scripts/pruefe-bauarten.mjs meldet sie.
  const gefilterteTypen = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return erreichbareItems.filter(item => {
      if (!raumAuswahlSichtbar) return passtZurSuche(item, s)
      const info = BAUARTEN[item.name]
      if (!info) return false
      const raumOk = aktiverRaum === 'alle' || info.raeume.includes(aktiverRaum)
      return raumOk && passtZurSuche(item, s)
    })
  }, [erreichbareItems, raumAuswahlSichtbar, aktiverRaum, suche])

  // Eine Karte je Bauart (Katalog-Umbau Teil 3, 17.11.2026). Bis dahin wurde eine Bauart mit
  // mehreren Produkten zu mehreren Karten mit gleichem Namen und Symbol aufgefächert. Das Produkt
  // wählt man ab Teil 4 rechts; bis dahin fügt ein Klick das erste Produkt der Bauart ein
  // (ersterVorschlag), mit dessen Maßen, Höhe und Farbe — wie bisher die erste der Karten.
  // Wandelemente (Fenster & Türen) haben keine Produktdaten und bleiben 1 Karte pro Typ.
  const gefilterteMoebel = useMemo(() => gefilterteTypen.flatMap(item => {
    if (item.typ) return [item]
    // Leuchten werden nicht nach Produkten aufgefächert: eine Karte je Leuchtentyp. Seit der
    // Katalog keine Fotos, Marken und Preise mehr zeigt, wären mehrere Produkte desselben Typs
    // mehrere Karten mit demselben Namen und demselben Symbol — eine Auswahl, die keine ist.
    // Bei Möbeln bleibt die Auffächerung bewusst bestehen.
    //
    // Maße, echte Höhe und Farbe kommen trotzdem weiter aus dem ersten Produkt des Typs, nur die
    // produktId nicht. Die Katalogwerte der Leuchten sind grobe Platzhalter (Deckenlampe 58 cm
    // breit in Orange statt 40 cm in Weiß, Kronleuchter ohne seine 1,10 m Höhe) — ohne diese
    // Zeile sähe jede neu eingefügte Leuchte anders aus als bisher. Verlinkt wird damit nichts.
    if (item.kategorie === LICHT_KATEGORIE) {
      const erstes = produkteFuerTyp(item.name)[0]
      if (!erstes) return [item]
      return [{ ...item, ...produktAufKatalogItemAnwenden(item, erstes), produktId: undefined }]
    }
    const produkt = ersterVorschlag(item.name)
    if (!produkt) return [item]
    return [{ ...item, ...produktAufKatalogItemAnwenden(item, produkt), produkt, katalogKey: item.name }]
  }), [gefilterteTypen])

  // Gruppen für Schritt 4: Familien in der Reihenfolge von FAMILIEN, darin die Bauarten in der
  // Reihenfolge von BAUARTEN; Familien mit Untergruppen (Deko) zusätzlich nach Untergruppe. Leere
  // Familien und Untergruppen fallen weg. In Schritt 2 und 3 null — dort bleibt die flache Liste.
  const gruppen = useMemo(() => {
    if (!raumAuswahlSichtbar) return null
    const reihenfolge = Object.keys(BAUARTEN)
    const sortiert = [...gefilterteMoebel].sort((a, b) => reihenfolge.indexOf(a.name) - reihenfolge.indexOf(b.name))
    return FAMILIEN.map(familie => {
      const items = sortiert.filter(item => BAUARTEN[item.name]?.familie === familie.key)
      const untergruppen = UNTERGRUPPEN[familie.key]
        ?.map(u => ({ ...u, items: items.filter(item => BAUARTEN[item.name]?.untergruppe === u.key) }))
        .filter(u => u.items.length > 0) || null
      return { ...familie, items, untergruppen }
    }).filter(familie => familie.items.length > 0)
  }, [raumAuswahlSichtbar, gefilterteMoebel])

  // Findet eine Suche in diesem Schritt nichts, in einem der anderen Katalog-Schritte aber schon,
  // auf den Sprung dorthin hinweisen statt einer leeren Spalte.
  // Findet die Suche im gewählten Raum nichts, in "Alle Räume" aber schon, darauf hinweisen —
  // sonst sieht "Bad" + "sofa" aus, als gäbe es gar keine Sofas (Befund vom 17.11.2026).
  const raumHinweis = useMemo(() => {
    const s = suche.trim().toLowerCase()
    if (!raumAuswahlSichtbar || aktiverRaum === 'alle' || gefilterteMoebel.length > 0 || !s) return null
    const anzahl = erreichbareItems.filter(item => BAUARTEN[item.name] && passtZurSuche(item, s)).length
    return anzahl > 0 ? { anzahl } : null
  }, [raumAuswahlSichtbar, aktiverRaum, gefilterteMoebel, suche, erreichbareItems])

  const sprungHinweis = useMemo(() => {
    const suchText = suche.trim().toLowerCase()
    if (!katalogSichtbar || gefilterteMoebel.length > 0 || !suchText) return null
    const andererSchritt = KATALOG_SCHRITTE.find(s => s !== schritt &&
      alleKatalogItems.some(item => KATEGORIE_FILTER_JE_SCHRITT[s](item) && passtZurSuche(item, suchText)))
    if (andererSchritt === undefined) return null
    const ziel = WIZARD_SCHRITTE.find(s => s.nummer === andererSchritt)
    return { schritt: andererSchritt, label: ziel?.label, beschreibung: ziel?.beschreibung }
  }, [katalogSichtbar, gefilterteMoebel, suche, schritt])

  const schrittHinweis = useMemo(() => (katalogSichtbar ? null : WIZARD_SCHRITTE.find(s => s.nummer === schritt)?.hinweis), [katalogSichtbar, schritt])

  const raeumeFuerAuswahl = useMemo(() => [{ key: 'alle', name: 'Alle Räume' }, ...RAEUME], [])

  // Farbe/Maße des konkret angeklickten Produkts stehen bereits auf dem Katalog-Eintrag selbst
  // (siehe gefilterteMoebel oben) — hier nur noch die Hilfsfelder abstreifen, die ausschließlich
  // fürs Rendern der Karte gebraucht wurden. Wandelemente (Tür/Fenster) haben keine Produktdaten
  // und bleiben unverändert.
  const katalogItemHinzufuegen = useCallback((item) => {
    if (item.typ) { addWandElement(item); return }
    const { produkt: _produkt, katalogKey: _katalogKey, ...rest } = item
    addFurniture(rest)
  }, [addFurniture, addWandElement])

  // Bauart wählen hebt die Auswahl eines platzierten Möbels auf, sonst stünde rechts dessen
  // Produktwechsel statt der Produktwahl.
  const waehleBauart = useCallback((name) => {
    setSelectedId(null)
    setGewaehlteBauart(name)
  }, [setSelectedId])
  const schliesseProduktwahl = useCallback(() => setGewaehlteBauart(null), [])

  // Fügt ein Produkt der gewählten Bauart ein, mit dessen Maßen, Höhe und Farbe — wie bisher der
  // Klick auf die Karte. produkt ist ein Eintrag aus produktempfehlungen.js oder null (Bauart ohne
  // Produkt: Katalogmaße).
  const fuegeProduktEin = useCallback((produkt) => {
    const katalogDefault = alleKatalogItems.find(k => k.name === gewaehlteBauart)
    if (!katalogDefault) return
    addFurniture({ ...katalogDefault, ...produktAufKatalogItemAnwenden(katalogDefault, produkt) })
  }, [addFurniture, gewaehlteBauart])

  const value = useMemo(() => ({
    suche, setSuche, aktiverRaum, setAktiverRaum, gefilterteMoebel, gruppen, katalogItemHinzufuegen,
    katalogSichtbar, raumAuswahlSichtbar, raeumeFuerAuswahl, raumHinweis, sprungHinweis, schrittHinweis,
    springeZuSchritt: setSchritt,
    gewaehlteBauart, waehleBauart, schliesseProduktwahl, fuegeProduktEin,
  }), [suche, aktiverRaum, gefilterteMoebel, gruppen, katalogItemHinzufuegen, katalogSichtbar, raumAuswahlSichtbar, raeumeFuerAuswahl, raumHinweis, sprungHinweis, schrittHinweis, setSchritt, gewaehlteBauart, waehleBauart, schliesseProduktwahl, fuegeProduktEin])

  return <KatalogContext.Provider value={value}>{children}</KatalogContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useKatalog() {
  return useContext(KatalogContext)
}
