import { useEffect } from 'react'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useWizard } from '../context/WizardContext'
import { useFurniture } from '../context/FurnitureContext'
import RaumSchritt from './RaumSchritt'
import FensterTuerenSchritt from './FensterTuerenSchritt'
import LichtSchritt from './LichtSchritt'
import MoebelDekoSchritt from './MoebelDekoSchritt'
import ProduktPanel from './ProduktPanel'

// Dieselbe Zeichenfolge wie in KatalogContext.jsx und ZusammenfassungSeite.jsx. Bewusst je Datei
// eigen und nicht zentral: Die drei haben nichts miteinander zu tun außer dem Wort.
const LICHT_KATEGORIE = 'Licht'

const SCHRITT_KOMPONENTEN = {
  1: RaumSchritt,
  2: FensterTuerenSchritt,
  3: LichtSchritt,
  4: MoebelDekoSchritt,
}

export default function PanelRechts() {
  const { raumPanelOffen, setRaumPanelOffen } = useUI()
  const { activeRoom } = useRooms()
  const { schritt } = useWizard()
  const { selectedId, setSelectedId, furniture } = useFurniture()
  const SchrittInhalt = SCHRITT_KOMPONENTEN[schritt]

  // Für Leuchten sowie für Fenster und Türen gibt es keine Produktwahl, und zwar ohne Hinweis
  // darauf. Sie werden vorerst nicht verlinkt; ein "für diesen Möbeltyp gibt es noch keine
  // Produktvorschläge" verspricht aber etwas für später, und was nicht versprochen ist, soll gar
  // nicht erst als Leerstelle erscheinen.
  //
  // Bei Wandelementen ist es mehr als eine Leerstelle: Im Katalog wählt man dort eine Bauart und
  // kein Produkt (keine Fotos, Marken und Preise, siehe c23bb41), und die Zusammenfassung lässt
  // Wandelemente ohnehin aus (gruppiere in ZusammenfassungSeite.jsx). Eine Produktwahl am Fenster
  // hätte also nirgends eine Wirkung.
  //
  // Die Prüfung steht hier und nicht in ProduktPanel selbst, weil daneben auch die Trennlinie
  // hängt: Dort allein wäre sie als Strich ohne Inhalt stehen geblieben.
  //
  // Nebenbei behoben: Vorher stand hier `furniture.find(...)?.kategorie !== LICHT_KATEGORIE`.
  // Findet sich zu einer gesetzten selectedId kein Möbel, ist `?.kategorie` undefined und damit
  // ungleich "Licht" — die Produktwahl wäre für ein Möbel erschienen, das es nicht gibt. Jetzt
  // wird erst das Möbel geholt und auf null geprüft.
  const gewaehltesMoebel = selectedId !== null ? furniture.find(f => f.id === selectedId) : null
  const zeigtProduktwahl = gewaehltesMoebel != null
    && gewaehltesMoebel.kategorie !== LICHT_KATEGORIE
    && !gewaehltesMoebel.istWandElement

  // Licht-Schritt (Phase 6, Teilschritt 1 — 7. Nachbesserung, ersetzt die 6.): die Leuchten-Liste
  // aus LichtSchritt (Überschrift "LEUCHTEN (n)" + eine Zeile je eingefügter Leuchte) hing in der
  // 6. Nachbesserung noch von `raumPanelOffen` ab — dieser Zustand wird aber u.a. umgeschaltet,
  // sobald man in der linken Raumliste auf den bereits aktiven Raum klickt (waehleRaum in
  // RoomsContext.jsx), und schloss die gerade erst sichtbar gemachte Liste dadurch sofort wieder.
  // Im Licht-Schritt hängt die Liste jetzt gar nicht mehr von `raumPanelOffen` ab — sie ist hier
  // immer da, unabhängig von diesem (für die anderen Schritte gedachten) Auf/Zu-Zustand. Die
  // "RAUMEINSTELLUNGEN"-Kopfzeile mit dem ✕-Schließen-Knopf passt inhaltlich ohnehin nicht zur
  // Leuchten-Liste und entfällt hier deshalb — die Liste beginnt jetzt direkt am oberen Rand.
  // Optimierung 1, Nachbesserung: Dasselbe gilt jetzt auch für den Möbel-&-Deko-Schritt. Dessen
  // Panel-Inhalt ist ebenfalls eine reine Liste (MÖBEL & DEKO, siehe MoebelDekoSchritt.jsx) und
  // keine "Raumeinstellung" — die Kopfzeile "RAUMEINSTELLUNGEN" passte dort inhaltlich nicht, und
  // der Auf/Zu-Knopf in der Seitenleiste hatte nichts zu schalten. Die Liste ist deshalb auch dort
  // immer sichtbar, und der Knopf entfällt in beiden Schritten (siehe Sidebar.jsx).
  const zeigtListeImmer = (schritt === 3 || schritt === 4) && activeRoom

  // Optimierung 1: Im Raum-Schritt klappt das Panel automatisch auf — dort stellt man Name, Form,
  // Maße, Boden und Wandfarbe ein, ohne das Panel gibt es in diesem Schritt also praktisch nichts
  // zu tun. Läuft nur bei einem Schritt-Wechsel (und beim ersten Rendern), nicht bei jedem Rendern:
  // wer das Panel im Raum-Schritt bewusst über das ✕ schließt, bekommt es dadurch nicht sofort
  // wieder aufgedrängt. Das Aufklappen beim Anlegen eines neuen Raums passiert weiterhin in
  // RoomsContext.addRoom.
  useEffect(() => {
    if (schritt === 1) setRaumPanelOffen(true)
  }, [schritt, setRaumPanelOffen])

  return (
    <div className="panel-rechts" style={{ width: '220px', background: 'white', borderLeft: '1px solid #E8E6E0', padding: '16px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
      {zeigtListeImmer ? (
        <>
          <SchrittInhalt />
          {zeigtProduktwahl && (
            <>
              <div style={{ height: '1px', background: '#E8E6E0' }}></div>
              <ProduktPanel />
            </>
          )}
        </>
      ) : zeigtProduktwahl ? (
        <ProduktPanel />
      ) : raumPanelOffen && activeRoom ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>RAUMEINSTELLUNGEN</p>
            {/* Hebt auch die Auswahl auf, nicht nur raumPanelOffen. Sonst schließt das ✕ bei einem
                ausgewählten Wandelement nichts: Der Zweig darunter zeigt denselben Inhalt weiter,
                nur ohne diese Kopfzeile — der Inhalt sprang 23 px nach oben, und der erste
                Schalter lag danach genau unter dem Zeiger. Wer ein zweites Mal klickte, weil
                nichts geschlossen schien, schaltete die Fußleiste aus.
                Für Möbel ändert sich dadurch nichts: Bei ihnen greift zeigtProduktwahl, und diese
                Kopfzeile wird gar nicht gerendert. */}
            <span onClick={() => { setRaumPanelOffen(false); setSelectedId(null) }} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '14px' }}>✕</span>
          </div>
          <SchrittInhalt />
        </>
      ) : gewaehltesMoebel && activeRoom ? (
        // Etwas ist ausgewählt, es gibt dafür aber keine Produktwahl (Wandelement oder Leuchte)
        // und das Raumpanel ist zu. Hier stand bis zu dieser Änderung der Hinweis auf die
        // Raumeinstellungen — ein Satz über Name, Größe und Bodenbelag, während ein Fenster
        // ausgewählt ist. Stattdessen der Inhalt des Schritts, in dem man gerade steht.
        //
        // Bewusst OHNE die "RAUMEINSTELLUNGEN"-Kopfzeile und ihr ✕: Das ✕ schaltet
        // raumPanelOffen aus, und das ist hier schon aus. Es wäre ein Knopf, der nichts tut,
        // solange die Auswahl steht.
        <SchrittInhalt />
      ) : (
        <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5 }}>Über „⚙ Raumeinstellungen" links stellst du Name, Größe, Fußleiste, Bodenbelag und Wandfarbe ein.</p>
      )}
    </div>
  )
}
