import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { alleKatalogItems, kategorien, WIZARD_SCHRITTE } from '../constants'
import { useFurniture } from './FurnitureContext'
import { useWizard } from './WizardContext'

const KatalogContext = createContext(null)

const FENSTER_TUEREN_KATEGORIE = 'Fenster & Türen'
const FENSTER_TUEREN_SCHRITT = 3
const MOEBEL_SCHRITT = 5

export function KatalogProvider({ children }) {
  const { addFurniture, addWandElement } = useFurniture()
  const { schritt, setSchritt } = useWizard()
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')

  // Der Katalog ist an die Wizard-Schritte gebunden, statt in jedem Schritt alles anzubieten —
  // sonst könnte man schon in Schritt 1 möblieren, was den Wizard sinnlos macht. Fenster & Türen
  // gehören zu Schritt 3, alles andere zu Schritt 5; Schritt 1/2/4 haben (noch) keinen Katalog.
  const katalogSichtbar = schritt === FENSTER_TUEREN_SCHRITT || schritt === MOEBEL_SCHRITT
  const kategorieAuswahlSichtbar = schritt === MOEBEL_SCHRITT

  const erreichbareItems = useMemo(() => {
    if (schritt === FENSTER_TUEREN_SCHRITT) return alleKatalogItems.filter(item => item.kategorie === FENSTER_TUEREN_KATEGORIE)
    if (schritt === MOEBEL_SCHRITT) return alleKatalogItems.filter(item => item.kategorie !== FENSTER_TUEREN_KATEGORIE)
    return []
  }, [schritt])

  // In Schritt 3 gibt es nur eine Kategorie, die Auswahl entfällt dort komplett (siehe oben) —
  // die gespeicherte aktiveKategorie ist dann irrelevant und wird ignoriert statt gefiltert.
  const gefilterteMoebel = useMemo(() => erreichbareItems.filter(item => {
    const kategorieOk = !kategorieAuswahlSichtbar || aktiveKategorie === 'Alle' || item.kategorie === aktiveKategorie
    const sucheOk = item.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  }), [erreichbareItems, kategorieAuswahlSichtbar, aktiveKategorie, suche])

  // Findet eine Suche in diesem Schritt nichts, im jeweils anderen Katalog-Schritt aber schon,
  // auf den Sprung dorthin hinweisen statt einer leeren Spalte.
  const sprungHinweis = useMemo(() => {
    if (!katalogSichtbar || gefilterteMoebel.length > 0 || !suche.trim()) return null
    const anderer = schritt === FENSTER_TUEREN_SCHRITT ? MOEBEL_SCHRITT : FENSTER_TUEREN_SCHRITT
    const gefundenAnderswo = alleKatalogItems.some(item =>
      item.name.toLowerCase().includes(suche.toLowerCase()) &&
      (anderer === FENSTER_TUEREN_SCHRITT ? item.kategorie === FENSTER_TUEREN_KATEGORIE : item.kategorie !== FENSTER_TUEREN_KATEGORIE))
    if (!gefundenAnderswo) return null
    return { schritt: anderer, label: WIZARD_SCHRITTE.find(s => s.nummer === anderer)?.label }
  }, [katalogSichtbar, gefilterteMoebel, suche, schritt])

  const schrittHinweis = useMemo(() => (katalogSichtbar ? null : WIZARD_SCHRITTE.find(s => s.nummer === schritt)?.hinweis), [katalogSichtbar, schritt])

  const kategorienFuerAuswahl = useMemo(() => kategorien.filter(kat => kat !== FENSTER_TUEREN_KATEGORIE), [])

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
