import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProjekte, saveProjekte } from './projekteStorage'
import { vergibProjektId, vergibRaumId, vergibMoebelId, vergibWandId } from './idZaehler'
import { erzeugeRaum } from '../constants'
import { serialisiereProjekt, parseProjektDatei, eindeutigerProjektname } from './projektExport'

const ProjekteListeContext = createContext(null)

export function ProjekteListeProvider({ children }) {
  const navigate = useNavigate()
  const [projekte, setProjekte] = useState(loadProjekte)

  useEffect(() => {
    saveProjekte(projekte)
  }, [projekte])

  // String(p.id) === String(id): id kann sowohl der native Wert eines Projekts (Dashboard.jsx,
  // z.B. beim Umbenennen/Löschen — dann immer schon vom selben Typ wie p.id) als auch der
  // String aus der URL sein (activeProjectId aus ProjectsContext.jsx, RoomsContext.jsx reicht ihn
  // an updateProjekt durch) — für alte Projekte ist p.id dann eine Zahl, id aber ein String.
  // Ohne die String()-Normalisierung würde updateProjekt/deleteProjekt für alte Projekte über
  // die URL nie mehr greifen, sobald activeProjectId nicht mehr per Number() erzwungen wird.
  const updateProjekt = useCallback((id, changes) => {
    setProjekte(prev => prev.map(p => String(p.id) === String(id)
      ? { ...p, ...changes, geaendertAm: new Date().toISOString() }
      : p))
  }, [])

  const addProjekt = useCallback((name) => {
    const jetzt = new Date().toISOString()
    const raumId = vergibRaumId()
    const standardRaum = erzeugeRaum({ id: raumId, name: 'Raum 1' })
    const neues = { id: vergibProjektId(), name, erstelltAm: jetzt, geaendertAm: jetzt, raeume: [standardRaum] }
    setProjekte(prev => [...prev, neues])
    navigate(`/projekt/${neues.id}`)
  }, [navigate])

  const deleteProjekt = useCallback((id) => {
    setProjekte(prev => prev.length === 1 ? prev : prev.filter(p => String(p.id) !== String(id)))
  }, [])

  const renameProjekt = useCallback((id, name) => {
    updateProjekt(id, { name })
  }, [updateProjekt])

  const waehleProjekt = useCallback((id) => {
    navigate(`/projekt/${id}`)
  }, [navigate])

  // Tiefe Kopie: jede Ebene (Projekt, Räume, Möbel, Trennwände) bekommt frische, app-weit
  // eindeutige IDs aus den zentralen Zählern — keine ID aus dem Original wird übernommen.
  const duplicateProjekt = useCallback((id) => {
    const original = projekte.find(p => p.id === id)
    if (!original) return
    const jetzt = new Date().toISOString()
    const raeumeKopie = (original.raeume || []).map(raum => ({
      ...raum,
      id: vergibRaumId(),
      furniture: (raum.furniture || []).map(item => ({ ...item, id: vergibMoebelId() })),
      trennwaende: (raum.trennwaende || []).map(wand => ({ ...wand, id: vergibWandId() })),
    }))
    const kopie = {
      ...original,
      id: vergibProjektId(),
      name: `${original.name} (Kopie)`,
      erstelltAm: jetzt,
      geaendertAm: jetzt,
      raeume: raeumeKopie,
    }
    setProjekte(prev => [...prev, kopie])
  }, [projekte])

  // Löst einen Browser-Download der Export-Datei aus (Blob + unsichtbarer <a download>-Klick,
  // Standardmuster ohne Server-Roundtrip) — Sicherheitsnetz gegen Datenverlust, siehe
  // projektExport.js für das Dateiformat.
  const exportProjekt = useCallback((id) => {
    const projekt = projekte.find(p => p.id === id)
    if (!projekt) return
    const { dateiname, json } = serialisiereProjekt(projekt)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = dateiname
    link.click()
    URL.revokeObjectURL(url)
  }, [projekte])

  // Liest eine zuvor exportierte Projektdatei ein und legt sie als NEUES Projekt an — überschreibt
  // nie ein bestehendes. parseProjektDatei prüft/migriert und vergibt bereits frische IDs (wie
  // duplicateProjekt oben); hier bleibt nur noch die Namenskollision mit der aktuellen Projektliste
  // zu klären, die parseProjektDatei (ohne Kenntnis der Liste) nicht selbst entscheiden kann.
  // Wirft weiter, wenn `text` kein gültiges Planixy-Projekt ist — der Aufrufer (Dashboard.jsx)
  // fängt das ab und zeigt die Fehlermeldung an.
  const importProjekt = useCallback((text) => {
    const importiert = parseProjektDatei(text)
    const name = eindeutigerProjektname(importiert.name, projekte.map(p => p.name))
    setProjekte(prev => [...prev, { ...importiert, name }])
  }, [projekte])

  const value = useMemo(() => ({
    projekte, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt, duplicateProjekt,
    exportProjekt, importProjekt,
  }), [
    projekte, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt, duplicateProjekt,
    exportProjekt, importProjekt,
  ])

  return <ProjekteListeContext.Provider value={value}>{children}</ProjekteListeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useProjekteListe() {
  return useContext(ProjekteListeContext)
}
