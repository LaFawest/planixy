import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const EinwilligungContext = createContext(null)

// Ein einziger localStorage-Schlüssel hält die gesamte Cookie-Einwilligung. Die Version steht mit
// drin: Kommt später eine neue Kategorie oder ein neuer Dienst dazu, wird EINWILLIGUNG_VERSION
// hochgezählt und alle Besucher werden erneut gefragt — genau das verlangt die DSGVO, wenn sich
// der Zweck der Einwilligung ändert.
const SPEICHER_SCHLUESSEL = 'planixy-cookie-einwilligung'
export const EINWILLIGUNG_VERSION = 1

// localStorage kann werfen (privates Fenster, blockierte Website-Daten). Dann verhält sich die App
// so, als wäre noch nichts entschieden: Der Banner erscheint erneut und es wird nichts außer dem
// technisch Notwendigen geladen — das ist die datenschutzfreundliche Richtung.
function ladeEinwilligung() {
  try {
    const roh = localStorage.getItem(SPEICHER_SCHLUESSEL)
    if (!roh) return null
    const daten = JSON.parse(roh)
    if (daten?.version !== EINWILLIGUNG_VERSION) return null
    return { statistik: !!daten.statistik, marketing: !!daten.marketing, zeitpunkt: daten.zeitpunkt }
  } catch {
    return null
  }
}

export function EinwilligungProvider({ children }) {
  const [einwilligung, setEinwilligung] = useState(ladeEinwilligung)
  // Wird true, wenn jemand die Einstellungen später erneut über den Link in den Rechtstexten
  // öffnet — dann erscheint der Banner wieder, obwohl schon eine Entscheidung gespeichert ist.
  const [erneutGeoeffnet, setErneutGeoeffnet] = useState(false)

  const speichereEinwilligung = useCallback((statistik, marketing) => {
    const daten = {
      version: EINWILLIGUNG_VERSION,
      statistik: !!statistik,
      marketing: !!marketing,
      zeitpunkt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(daten))
    } catch {
      // Speichern nicht möglich (privates Fenster o.ä.) — die Entscheidung gilt dann nur für diese
      // Sitzung, der Banner kommt beim nächsten Besuch erneut.
    }
    setEinwilligung({ statistik: daten.statistik, marketing: daten.marketing, zeitpunkt: daten.zeitpunkt })
    setErneutGeoeffnet(false)
  }, [])

  const oeffneEinstellungen = useCallback(() => setErneutGeoeffnet(true), [])

  // Zentrale Abfrage für später hinzukommende Dienste: KEIN Skript für Statistik oder Marketing
  // darf ohne ein true von hier geladen werden.
  const hatEinwilligung = useCallback(
    (kategorie) => (kategorie === 'notwendig' ? true : !!einwilligung?.[kategorie]),
    [einwilligung],
  )

  const value = useMemo(() => ({
    einwilligung,
    bannerSichtbar: einwilligung === null || erneutGeoeffnet,
    erneutGeoeffnet,
    speichereEinwilligung,
    oeffneEinstellungen,
    hatEinwilligung,
  }), [einwilligung, erneutGeoeffnet, speichereEinwilligung, oeffneEinstellungen, hatEinwilligung])

  return <EinwilligungContext.Provider value={value}>{children}</EinwilligungContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useEinwilligung() {
  const ctx = useContext(EinwilligungContext)
  if (!ctx) throw new Error('useEinwilligung muss innerhalb von EinwilligungProvider verwendet werden')
  return ctx
}
