import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { alleKatalogItems, kategorien, WIZARD_SCHRITTE } from '../constants'
import { useFurniture } from './FurnitureContext'
import { useWizard } from './WizardContext'

const KatalogContext = createContext(null)

const FENSTER_TUEREN_KATEGORIE = 'Fenster & Türen'
const LICHT_KATEGORIE = 'Licht'
const FENSTER_TUEREN_SCHRITT = 3
const LICHT_SCHRITT = 4
const MOEBEL_SCHRITT = 5

// Der Katalog ist an die Wizard-Schritte gebunden, statt in jedem Schritt alles anzubieten —
// sonst könnte man schon in Schritt 1 möblieren, was den Wizard sinnlos macht. Fenster & Türen
// gehören zu Schritt 3, Leuchten zu Schritt 4, alles andere zu Schritt 5 — jeder dieser drei
// Schritte bekommt hier seine eigene Kategorie-Filterregel; Schritt 1/2 haben keinen Katalog.
const KATEGORIE_FILTER_JE_SCHRITT = {
  [FENSTER_TUEREN_SCHRITT]: (item) => item.kategorie === FENSTER_TUEREN_KATEGORIE,
  [LICHT_SCHRITT]: (item) => item.kategorie === LICHT_KATEGORIE,
  [MOEBEL_SCHRITT]: (item) => item.kategorie !== FENSTER_TUEREN_KATEGORIE && item.kategorie !== LICHT_KATEGORIE,
}
const KATALOG_SCHRITTE = Object.keys(KATEGORIE_FILTER_JE_SCHRITT).map(Number)

export function KatalogProvider({ children }) {
  const { addFurniture, addWandElement } = useFurniture()
  const { schritt, setSchritt } = useWizard()
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')

  const katalogSichtbar = KATALOG_SCHRITTE.includes(schritt)
  const kategorieAuswahlSichtbar = schritt === MOEBEL_SCHRITT

  const erreichbareItems = useMemo(() => {
    const filter = KATEGORIE_FILTER_JE_SCHRITT[schritt]
    return filter ? alleKatalogItems.filter(filter) : []
  }, [schritt])

  // In Schritt 3/4 gibt es nur eine Kategorie, die Auswahl entfällt dort komplett (siehe oben) —
  // die gespeicherte aktiveKategorie ist dann irrelevant und wird ignoriert statt gefiltert.
  const gefilterteMoebel = useMemo(() => erreichbareItems.filter(item => {
    const kategorieOk = !kategorieAuswahlSichtbar || aktiveKategorie === 'Alle' || item.kategorie === aktiveKategorie
    const sucheOk = item.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  }), [erreichbareItems, kategorieAuswahlSichtbar, aktiveKategorie, suche])

  // Findet eine Suche in diesem Schritt nichts, in einem der anderen Katalog-Schritte aber schon,
  // auf den Sprung dorthin hinweisen statt einer leeren Spalte.
  const sprungHinweis = useMemo(() => {
    if (!katalogSichtbar || gefilterteMoebel.length > 0 || !suche.trim()) return null
    const andererSchritt = KATALOG_SCHRITTE.find(s => s !== schritt &&
      alleKatalogItems.some(item => KATEGORIE_FILTER_JE_SCHRITT[s](item) && item.name.toLowerCase().includes(suche.toLowerCase())))
    if (andererSchritt === undefined) return null
    return { schritt: andererSchritt, label: WIZARD_SCHRITTE.find(s => s.nummer === andererSchritt)?.label }
  }, [katalogSichtbar, gefilterteMoebel, suche, schritt])

  const schrittHinweis = useMemo(() => (katalogSichtbar ? null : WIZARD_SCHRITTE.find(s => s.nummer === schritt)?.hinweis), [katalogSichtbar, schritt])

  const kategorienFuerAuswahl = useMemo(() => kategorien.filter(kat => kat !== FENSTER_TUEREN_KATEGORIE && kat !== LICHT_KATEGORIE), [])

  const katalogItemHinzufuegen = useCallback((item) => {
    item.typ ? addWandElement(item) : addFurniture(item)
  }, [addFurniture, addWandElement])

  const value = useMemo(() => ({
    suche, setSuche, aktiveKategorie, setAktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen,
    katalogSichtbar, kategorieAuswahlSichtbar, kategorienFuerAuswahl, sprungHinweis, schrittHinweis,
    springeZuSchritt: setSchritt,
  }), [suche, aktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen, katalogSichtbar, kategorieAuswahlSichtbar, kategorienFuerAuswahl, sprungHinweis, schrittHinweis, setSchritt])

  return <KatalogContext.Provider value={value}>{children}</KatalogContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useKatalog() {
  return useContext(KatalogContext)
}
