import { wandMaterialien, wandFarben, istGestrichen, wandMaterialInfo, wandAusfuehrungen, wandGrundfarbe, HIMMELSRICHTUNG_NAME } from '../constants'
import { himmelsrichtungAusNormale } from '../raumPolygon'
import { useDesign } from '../context/DesignContext'
import { useRaumGeometrie } from '../context/useRaumGeometrie'

export default function FensterTuerenSchritt() {
  const { wandSegmente } = useRaumGeometrie()
  const {
    fussleiste, setFussleiste, fussleisteFarbe, setFussleisteFarbe,
    aktiveWand, setAktiveWand, aktuelleWandfarbe, setWandfarbeFuer,
    aktuellesWandmaterial, setWandmaterialFuer,
  } = useDesign()

  // Chips nummeriert je Wandsegment, Himmelsrichtung als Zusatz aus der Segmentnormale
  // abgeleitet (himmelsrichtungAusNormale) — funktioniert für jede Raumform, nicht nur für
  // die vier festen Rechteckwände. Gilt jetzt für Material UND Farbe gemeinsam.
  const wandChips = [
    { seite: 'alle', name: 'Alle' },
    ...wandSegmente.map(segment => ({
      seite: segment.index,
      name: `Wand ${segment.index + 1} (${HIMMELSRICHTUNG_NAME[himmelsrichtungAusNormale(segment.normale)]})`,
    })),
  ]

  // Stammt die aktuelle Wandfarbe aus der Palette oder hat jemand sie selbst gewählt? Danach
  // richtet sich, ob die Kachel "Eigene Farbe" hervorgehoben ist und ihren Hex-Wert anzeigt.
  // Kleinschreibung auf beiden Seiten, weil der Farbwähler des Browsers Kleinbuchstaben liefert,
  // die Palette in constants.js aber Großbuchstaben verwendet — sonst gälte "#FFFFFF" aus der
  // Palette und "#ffffff" aus dem Wähler als zwei verschiedene Farben.
  const istEigeneFarbe = !!aktuelleWandfarbe &&
    !wandFarben.some(w => w.farbe.toLowerCase() === aktuelleWandfarbe.toLowerCase())

  // Wert aus dem Farbwähler übernehmen. Trifft er zufällig einen Paletteneintrag, wird dessen
  // Schreibweise gespeichert — die Palettenkacheln vergleichen exakt (===), sonst wäre bei
  // "#ffffff" aus dem Wähler weder "Weiß" noch "Eigene Farbe" hervorgehoben.
  const setEigeneWandfarbe = (hex) => {
    const treffer = wandFarben.find(w => w.farbe.toLowerCase() === hex.toLowerCase())
    setWandfarbeFuer(treffer ? treffer.farbe : hex)
  }

  // Wird die gewählte Oberfläche gestrichen? Nur dann gehört die Farbpalette hierher. Eine
  // Paneele oder eine Mustertapete kauft man in einer Ausführung, sie wird nicht überstrichen —
  // eine Farbwahl anzubieten, die im 3D-Bild absichtlich ignoriert wird, wäre irreführend.
  //
  // aktuellesWandmaterial kommt aus dem DesignContext und richtet sich nach dem Wand-Chip
  // darüber. Steht dort „Alle", ist es das Material des Raums. Tragen einzelne Wände abweichende
  // Materialien, entscheidet also das Raum-Material darüber, ob die Palette zu sehen ist — das
  // ist genau dieselbe Vereinfachung, die das Materialraster oben schon immer hatte, und bleibt
  // bewusst so.
  const wandWirdGestrichen = istGestrichen(aktuellesWandmaterial)

  // Die Kachel, zu der das gewählte Material gehört, und ihre Ausführungen. Gespeichert ist die
  // Ausführung (z.B. wand-tapete-streifen), hervorgehoben werden muss die Kachel
  // (Mustertapete) — sonst bliebe das Raster ohne Markierung, sobald jemand eine andere
  // Ausführung als die erste wählt.
  const aktuelleKachel = wandMaterialInfo(aktuellesWandmaterial)
  const aktuelleAusfuehrungen = wandAusfuehrungen(aktuellesWandmaterial)

  return (
    <>
      {/* Fußleiste */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.06em' }}>FUSSLEISTE</p>
          <div onClick={() => setFussleiste(!fussleiste)} style={{
            width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
            background: fussleiste ? '#185FA5' : '#E8E6E0', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '2px', left: fussleiste ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: 'white',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}></div>
          </div>
        </div>
        {fussleiste && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { name: 'Weiß',    farbe: '#FFFFFF' },
              { name: 'Creme',   farbe: '#E0DDD8' },
              { name: 'Grau',    farbe: '#B4B2A9' },
              { name: 'Schwarz', farbe: '#2C2C2A' },
              { name: 'Holz',    farbe: '#C8A97A' },
              // „Wand" ist die Abkürzung zum Übernehmen des Wandtons. Dafür muss der angebotene
              // Wert der sein, den man auch sieht: bei einer gestrichenen Wand die gewählte Farbe,
              // bei einer gekauften Ausführung deren Grundfarbe. Stand hier vorher stur
              // room.wandfarbe, hätte die Kachel bei einer Holzpaneele die alte, im Bild nicht mehr
              // vorhandene Farbe angeboten — eine dunkelblaue Fußleiste an einer braunen Wand.
              //
              // Gleichzeitig sind es jetzt aktuelleWandfarbe/aktuellesWandmaterial statt
              // activeRoom.wandfarbe, also dieselben Werte, nach denen sich das ganze Panel richtet:
              // Ist oben eine einzelne Wand gewählt, ist es deren Ton und nicht mehr der des Raums.
              //
              // Kopiert wird der Wert weiterhin nur beim Klick. Wer die Wand danach umfärbt, soll
              // die Fußleiste nicht ungefragt mitwandern sehen.
              { name: 'Wand',    farbe: wandWirdGestrichen
                ? (aktuelleWandfarbe || '#FFFFFF')
                : wandGrundfarbe(aktuellesWandmaterial) },
            ].map(f => (
              <div key={f.name} onClick={() => setFussleisteFarbe(f.farbe)} style={{
                width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                background: f.farbe, border: `${fussleisteFarbe === f.farbe ? '3px' : '1px'} solid ${fussleisteFarbe === f.farbe ? '#185FA5' : '#E8E6E0'}`,
                title: f.name,
              }} title={f.name}></div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#E8E6E0' }}></div>

      <div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WAND</p>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {wandChips.map(w => (
            <div key={w.seite} onClick={() => setAktiveWand(w.seite)} style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
              background: aktiveWand === w.seite ? '#185FA5' : '#F7F6F2',
              color: aktiveWand === w.seite ? 'white' : '#888780',
              border: `1px solid ${aktiveWand === w.seite ? '#185FA5' : '#E8E6E0'}`,
            }}>{w.name}</div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDMATERIAL</p>
        {/* minmax(0, 1fr) statt 1fr: Die Kurzform 1fr bedeutet minmax(auto, 1fr), und dieses auto
            heißt "mindestens so breit wie der längste unteilbare Inhalt". Lange Bezeichnungen wie
            "Raufaser mittel" haben das Raster dadurch über die Panelbreite hinausgedrückt. Die 0
            als Mindestbreite erlaubt den Spalten überhaupt erst zu schrumpfen — zusammen mit der
            Umbruchregel an der Beschriftung weiter unten, ohne die der Text nur abgeschnitten
            würde statt umzubrechen. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
          {/* Ohne die Tattoos: Sie sind keine Wandoberfläche, sondern ein Motiv für eine
              aufgezogene Fläche, und gehören deshalb nur in die Materialleiste des
              Paint-Werkzeugs im 3D-Bild. */}
          {wandMaterialien.filter(material => !material.tattoo).map(material => (
            // aktuelleKachel statt aktuellesWandmaterial: Steht die Wand auf „Streifen", ist die
            // gespeicherte Klasse wand-tapete-streifen, hervorgehoben gehört aber die Kachel
            // Mustertapete. Ein Klick wählt weiterhin material.klasse, also die erste Ausführung.
            <div key={material.name} onClick={() => setWandmaterialFuer(material.klasse)} style={{
              padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
              border: `${aktuelleKachel.klasse === material.klasse ? '2px' : '1px'} solid ${aktuelleKachel.klasse === material.klasse ? '#185FA5' : '#E8E6E0'}`,
              background: aktuelleKachel.klasse === material.klasse ? '#EEF4FC' : '#FAFAF8',
              fontSize: '10px', color: aktuelleKachel.klasse === material.klasse ? '#185FA5' : '#444441',
              overflowWrap: 'anywhere', lineHeight: 1.25,
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>{material.icon}</div>
              {material.name}
            </div>
          ))}
        </div>
      </div>

      {/* Farbpalette nur bei gestrichenen Oberflächen — siehe wandWirdGestrichen oben. Die
          Einrückung des Blocks darunter bleibt absichtlich unverändert, damit der Diff klein
          bleibt. */}
      {wandWirdGestrichen ? (
      <div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDFARBE</p>
        {/* Dieselbe Falle wie beim Materialraster darüber: "Terrakotta" und "Dunkelgrün" standen
            schon vorher am Rand. Gleich mitbehoben, sonst fällt es beim nächsten langen Farbnamen
            wieder auf. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
          {wandFarben.map(wand => (
            <div key={wand.name} onClick={() => setWandfarbeFuer(wand.farbe)} style={{
              padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
              border: `${aktuelleWandfarbe === wand.farbe ? '2px' : '1px'} solid ${aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#E8E6E0'}`,
              background: aktuelleWandfarbe === wand.farbe ? '#EEF4FC' : '#FAFAF8',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
              <div style={{ fontSize: '10px', color: aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#444441', fontWeight: aktuelleWandfarbe === wand.farbe ? '500' : '400', overflowWrap: 'anywhere', lineHeight: 1.25 }}>{wand.name}</div>
            </div>
          ))}

          {/* "Eigene Farbe": öffnet den Farbwähler des Browsers, dieselbe Technik wie beim
              LED-Streifen in LichtSchritt.jsx. Der Dialog bietet Hex- und RGB-Eingabe von sich aus
              an, ein eigenes Textfeld wäre also doppelt gemoppelt.

              Bewusst als LETZTE Kachel: Wer nichts Bestimmtes sucht, soll zuerst die fertigen Töne
              sehen. Die Palette bleibt die Empfehlung, der Wähler ist der Ausweg für alle, die
              ihren Ton schon kennen.

              Das eigentliche input liegt unsichtbar im label — ein Klick auf die Kachel öffnet
              dadurch den Wähler, ohne dass das Kästchen des Browsers die Gestaltung stört.
              Bewusst NICHT display:none, sonst erreicht der Klick das Feld je nach Browser nicht
              mehr; ein Feld ohne Größe und ohne Zeigerereignisse tut dasselbe und bleibt
              erreichbar. */}
          <label style={{
            display: 'block', padding: '8px 4px', borderRadius: '10px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            border: `${istEigeneFarbe ? '2px' : '1px'} solid ${istEigeneFarbe ? '#185FA5' : '#E8E6E0'}`,
            background: istEigeneFarbe ? '#EEF4FC' : '#FAFAF8',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px',
              border: '1px solid #E8E6E0',
              background: istEigeneFarbe
                ? aktuelleWandfarbe
                : 'conic-gradient(#E8927C, #F5E6A0, #A8D5C2, #B8D4E8, #C4B8D4, #E8927C)',
            }}></div>
            <div style={{
              fontSize: '10px',
              color: istEigeneFarbe ? '#185FA5' : '#444441',
              fontWeight: istEigeneFarbe ? '500' : '400',
            }}>
              {istEigeneFarbe ? aktuelleWandfarbe.toUpperCase() : 'Eigene Farbe'}
            </div>
            <input
              type="color"
              value={aktuelleWandfarbe || '#FFFFFF'}
              onChange={e => setEigeneWandfarbe(e.target.value)}
              style={{ width: 0, height: 0, opacity: 0, pointerEvents: 'none', border: 'none', padding: 0 }}
            />
          </label>
        </div>
      </div>
      ) : (
        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>AUSFÜHRUNG</p>
          {aktuelleAusfuehrungen ? (
            // Dasselbe Raster wie bei der Farbpalette darüber, inklusive minmax(0, 1fr) und der
            // Umbruchregel — die Namen der Muster werden nicht kürzer als „Dunkelgrün".
            // Der Kreis zeigt die Grundfarbe. Das ist bewusst keine Vorschau des Musters: ein
            // 28-Pixel-Kreis kann kein Blumenmuster zeigen, und ein unleserliches Miniaturbild
            // wäre irreführender als ein ehrlicher Farbpunkt.
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
              {aktuelleAusfuehrungen.map(ausfuehrung => (
                <div key={ausfuehrung.klasse} onClick={() => setWandmaterialFuer(ausfuehrung.klasse)} style={{
                  padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                  border: `${aktuellesWandmaterial === ausfuehrung.klasse ? '2px' : '1px'} solid ${aktuellesWandmaterial === ausfuehrung.klasse ? '#185FA5' : '#E8E6E0'}`,
                  background: aktuellesWandmaterial === ausfuehrung.klasse ? '#EEF4FC' : '#FAFAF8',
                }}>
                  {ausfuehrung.icon ? (
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{ausfuehrung.icon}</div>
                  ) : (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px',
                      background: ausfuehrung.grundfarbe || '#FFFFFF', border: '1px solid #E8E6E0',
                    }}></div>
                  )}
                  <div style={{
                    fontSize: '10px',
                    color: aktuellesWandmaterial === ausfuehrung.klasse ? '#185FA5' : '#444441',
                    fontWeight: aktuellesWandmaterial === ausfuehrung.klasse ? '500' : '400',
                    overflowWrap: 'anywhere', lineHeight: 1.25,
                  }}>{ausfuehrung.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '11px', color: '#888780', lineHeight: 1.45 }}>
              Diese Oberfläche wird fertig gekauft und nicht gestrichen — die Farbe steckt im Muster selbst.
            </p>
          )}
        </div>
      )}
    </>
  )
}
