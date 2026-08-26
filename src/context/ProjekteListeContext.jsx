import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { loadProjekte, saveProjekte } from './projekteStorage'
import { ladeProjekteSupabase, erstelleProjektSupabase, speichereProjektSupabase, loescheProjektSupabase } from './projekteSupabaseStorage'
import { vergibProjektId, vergibRaumId, vergibMoebelId, vergibWandId } from './idZaehler'
import { erzeugeRaum } from '../constants'
import { serialisiereProjekt, parseProjektDatei, eindeutigerProjektname } from './projektExport'

const ProjekteListeContext = createContext(null)

// Bündelt Änderungen (z.B. jeden Mausschritt beim Möbel-Ziehen) zu einem Supabase-Request statt
// bei jeder einzelnen updateProjekt()-Änderung zu schreiben.
const SPEICHER_DEBOUNCE_MS = 1000

export function ProjekteListeProvider({ children }) {
  const navigate = useNavigate()
  const { user, ladeStatus: authLadeStatus } = useAuth()
  const eingeloggt = !!user

  const [projekte, setProjekte] = useState([])
  // true, solange die Datenquelle (Auth-Status selbst, dann localStorage bzw. Supabase-Fetch) noch
  // nicht feststeht — Dashboard.jsx nutzt das, um in diesem kurzen Fenster nicht fälschlich "kein
  // Projekt angelegt" zu zeigen, bevor die echten Daten da sind.
  const [projekteLadeStatus, setProjekteLadeStatus] = useState(true)

  // Immer aktueller Snapshot für die Debounce-Timer unten (die feuern zeitversetzt und dürfen
  // nicht auf einem veralteten Closure-Stand von `projekte` speichern).
  const projekteRef = useRef(projekte)
  useEffect(() => { projekteRef.current = projekte }, [projekte])

  // Ein Timer pro Projekt-ID, jeder trägt die user_id, für die er geplant wurde — falls ein
  // Login/Logout mitten im Debounce-Fenster passiert, speichert ein noch laufender Timer trotzdem
  // unter dem richtigen (alten) Nutzer, statt beim Feuern den dann schon gewechselten `user` zu lesen.
  const speicherTimer = useRef({})

  const flushEintrag = useCallback((id) => {
    const key = String(id)
    const eintrag = speicherTimer.current[key]
    if (!eintrag) return
    clearTimeout(eintrag.timer)
    delete speicherTimer.current[key]
    const aktuell = projekteRef.current.find(p => String(p.id) === key)
    if (aktuell) speichereProjektSupabase(eintrag.userId, aktuell).catch(err => console.error('Projekt konnte nicht gespeichert werden', err))
  }, [])

  const verwerfeEintrag = useCallback((id) => {
    const key = String(id)
    clearTimeout(speicherTimer.current[key]?.timer)
    delete speicherTimer.current[key]
  }, [])

  const flushAlle = useCallback(() => {
    Object.keys(speicherTimer.current).forEach(flushEintrag)
  }, [flushEintrag])

  const debounceSpeichern = useCallback((id) => {
    if (!user) return
    const key = String(id)
    clearTimeout(speicherTimer.current[key]?.timer)
    const timer = setTimeout(() => flushEintrag(key), SPEICHER_DEBOUNCE_MS)
    speicherTimer.current[key] = { timer, userId: user.id }
  }, [user, flushEintrag])

  // Datenquelle laden, sobald der Auth-Status feststeht — vorher weder localStorage noch Supabase
  // anfassen, sonst würde ein eigentlich eingeloggter Nutzer beim Start kurz die Gast-Projekte
  // sehen, bevor die Session geladen ist. flushAlle() sichert offene Änderungen des bisherigen
  // Nutzers, bevor auf die neue Quelle umgeschaltet wird (siehe speicherTimer oben).
  useEffect(() => {
    if (authLadeStatus) return
    flushAlle()
    let abgebrochen = false
    setProjekteLadeStatus(true)
    if (user) {
      ladeProjekteSupabase(user.id)
        .then(geladen => { if (!abgebrochen) setProjekte(geladen) })
        .catch(err => {
          console.error('Projekte konnten nicht geladen werden', err)
          if (!abgebrochen) setProjekte([])
        })
        .finally(() => { if (!abgebrochen) setProjekteLadeStatus(false) })
    } else {
      setProjekte(loadProjekte())
      setProjekteLadeStatus(false)
    }
    return () => { abgebrochen = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur an user/authLadeStatus gekoppelt; flushAlle ist über seine eigenen Deps stabil
  }, [user, authLadeStatus])

  // Gast-Pfad: unverändert wie bisher bei jeder Änderung das komplette Array zurückschreiben.
  // Eingeloggter Pfad: Persistenz läuft granular über die einzelnen Mutatoren unten (debounceSpeichern
  // / erstelleProjektSupabase / loescheProjektSupabase) — kein Blanket-Save hier, sonst würde bei
  // jeder Änderung die komplette Projektliste statt nur der betroffenen Zeile geschrieben.
  useEffect(() => {
    if (eingeloggt || projekteLadeStatus) return
    saveProjekte(projekte)
  }, [projekte, eingeloggt, projekteLadeStatus])

  // Offene Debounce-Saves beim Verlassen der Seite nicht verwerfen.
  useEffect(() => flushAlle, [flushAlle])

  const updateProjekt = useCallback((id, changes) => {
    setProjekte(prev => prev.map(p => String(p.id) === String(id)
      ? { ...p, ...changes, geaendertAm: new Date().toISOString() }
      : p))
    if (eingeloggt) debounceSpeichern(id)
  }, [eingeloggt, debounceSpeichern])

  const addProjekt = useCallback((name) => {
    const jetzt = new Date().toISOString()
    const raumId = vergibRaumId()
    const standardRaum = erzeugeRaum({ id: raumId, name: 'Raum 1' })
    const neues = { id: vergibProjektId(), name, erstelltAm: jetzt, geaendertAm: jetzt, raeume: [standardRaum] }
    setProjekte(prev => [...prev, neues])
    if (eingeloggt) erstelleProjektSupabase(user.id, neues).catch(err => console.error('Projekt konnte nicht angelegt werden', err))
    navigate(`/projekt/${neues.id}`)
  }, [navigate, eingeloggt, user])

  const deleteProjekt = useCallback((id) => {
    setProjekte(prev => prev.length === 1 ? prev : prev.filter(p => String(p.id) !== String(id)))
    verwerfeEintrag(id)
    if (eingeloggt) loescheProjektSupabase(user.id, id).catch(err => console.error('Projekt konnte nicht gelöscht werden', err))
  }, [eingeloggt, user, verwerfeEintrag])

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
    if (eingeloggt) erstelleProjektSupabase(user.id, kopie).catch(err => console.error('Projekt konnte nicht dupliziert werden', err))
  }, [projekte, eingeloggt, user])

  // Löst einen Browser-Download der Export-Datei aus (Blob + unsichtbarer <a download>-Klick,
  // Standardmuster ohne Server-Roundtrip) — Sicherheitsnetz gegen Datenverlust, siehe
  // projektExport.js für das Dateiformat. Unabhängig von der Datenquelle: liest nur den aktuellen
  // In-Memory-Stand, egal ob der aus localStorage oder Supabase geladen wurde.
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
    const neues = { ...importiert, name }
    setProjekte(prev => [...prev, neues])
    if (eingeloggt) erstelleProjektSupabase(user.id, neues).catch(err => console.error('Projekt konnte nicht importiert werden', err))
  }, [projekte, eingeloggt, user])

  const value = useMemo(() => ({
    projekte, projekteLadeStatus, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt, duplicateProjekt,
    exportProjekt, importProjekt,
  }), [
    projekte, projekteLadeStatus, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt, duplicateProjekt,
    exportProjekt, importProjekt,
  ])

  return <ProjekteListeContext.Provider value={value}>{children}</ProjekteListeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useProjekteListe() {
  return useContext(ProjekteListeContext)
}
