import { bodenBelaege, wandFarben, HIMMELSRICHTUNG_NAME } from '../constants'
import { himmelsrichtungAusNormale } from '../raumPolygon'
import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'
import { useRaumGeometrie } from '../context/useRaumGeometrie'

export default function FarbenBodenSchritt() {
  const { activeRoom } = useRooms()
  const { wandSegmente } = useRaumGeometrie()
  const {
    fussleiste, setFussleiste, fussleisteFarbe, setFussleisteFarbe, setBoden,
    aktiveWand, setAktiveWand, aktuelleWandfarbe, setWandfarbeFuer,
  } = useDesign()
  // Chips nummeriert je Wandsegment, Himmelsrichtung als Zusatz aus der Segmentnormale
  // abgeleitet (himmelsrichtungAusNormale) — funktioniert für jede Raumform, nicht nur für
  // die vier festen Rechteckwände. Für ein Rechteck ergibt sich exakt Wand 1 (Nord) ...
  // Wand 4 (West) in derselben Reihenfolge wie die bisherigen Nord/Ost/Süd/West-Chips.
  const wandChips = [
    { seite: 'alle', name: 'Alle' },
    ...wandSegmente.map(segment => ({
      seite: segment.index,
      name: `Wand ${segment.index + 1} (${HIMMELSRICHTUNG_NAME[himmelsrichtungAusNormale(segment.normale)]})`,
    })),
  ]
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
              { name: 'Wand',    farbe: activeRoom?.wandfarbe || '#FFFFFF' },
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
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>BODENBELAG</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {bodenBelaege.map(boden => (
            <div key={boden.name} onClick={() => setBoden(boden.klasse)} style={{
              padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
              border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`,
              background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8',
              fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
              {boden.name}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDFARBE</p>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {wandChips.map(w => (
            <div key={w.seite} onClick={() => setAktiveWand(w.seite)} style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
              background: aktiveWand === w.seite ? '#185FA5' : '#F7F6F2',
              color: aktiveWand === w.seite ? 'white' : '#888780',
              border: `1px solid ${aktiveWand === w.seite ? '#185FA5' : '#E8E6E0'}`,
            }}>{w.name}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {wandFarben.map(wand => (
            <div key={wand.name} onClick={() => setWandfarbeFuer(wand.farbe)} style={{
              padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
              border: `${aktuelleWandfarbe === wand.farbe ? '2px' : '1px'} solid ${aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#E8E6E0'}`,
              background: aktuelleWandfarbe === wand.farbe ? '#EEF4FC' : '#FAFAF8',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
              <div style={{ fontSize: '10px', color: aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#444441', fontWeight: aktuelleWandfarbe === wand.farbe ? '500' : '400' }}>{wand.name}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
