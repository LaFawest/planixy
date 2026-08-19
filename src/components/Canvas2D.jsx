import RoomView3D from '../RoomView3D'
import { moebelIconTyp, moebelShapes } from '../moebelIcons'
import RotationsPanel from './RotationsPanel'
import TrennwandPanel from './TrennwandPanel'
import { HIMMELSRICHTUNG_JE_SEGMENT } from '../constants'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'
import { useFurniture } from '../context/FurnitureContext'
import { useTrennwand } from '../context/TrennwandContext'
import { useWizard } from '../context/WizardContext'

const wandFarbeFuer = (room, seite) => room?.wandfarben?.[seite] || room?.wandfarbe || '#FFFFFF'

// Position/Größe eines Wandstreifens aus seinem Segment: die Kante selbst bildet eine
// Seite des Streifens, der Streifen wird um die Wanddicke entgegen der Normale (also nach
// innen) verbreitert. Nur für achsparallele Segmente (Rechteck) — bei freien Formen muss
// das verallgemeinert werden.
const wandStreifenStyle = (segment, wandDicke) => {
  const minX = Math.min(segment.start.x, segment.ende.x)
  const maxX = Math.max(segment.start.x, segment.ende.x)
  const minY = Math.min(segment.start.y, segment.ende.y)
  const maxY = Math.max(segment.start.y, segment.ende.y)
  if (minY === maxY) {
    const top = segment.normale.y < 0 ? minY : minY - wandDicke
    return { left: `${minX}px`, top: `${top}px`, width: `${maxX - minX}px`, height: `${wandDicke}px` }
  }
  const left = segment.normale.x < 0 ? minX : minX - wandDicke
  return { left: `${left}px`, top: `${minY}px`, width: `${wandDicke}px`, height: `${maxY - minY}px` }
}

export default function Canvas2D({ canvasB, canvasT, innenB, innenT, wandDicke, wandSegmente }) {
  const { ansicht } = useUI()
  const { schritt } = useWizard()
  const { activeRoom } = useRooms()
  const { fussleiste, fussleisteFarbe } = useDesign()
  const { furniture, selectedId, setSelectedId, handleDrag, removeFurniture } = useFurniture()
  const {
    zeichneWand, setZeichneWand, wandVorschau, setWandVorschau, bestaetigeWand, verwerfeWand, startWandZeichnen,
    setSelectedWandId, trennwaende, selectedWandId, handleWandDrag, wandEntwurf, canvasInnerRef,
  } = useTrennwand()
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F4F0', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: '#B4B2A9', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid #E8E6E0', zIndex: 10, whiteSpace: 'nowrap' }}>
          {ansicht === '2d' ? (wandVorschau ? 'Oben bestätigen oder verwerfen' : zeichneWand ? 'Wand ziehen · Winkel schnappt bei 45° · Esc zum Beenden' : 'Doppelklick auf Raumnamen · Blau = Drehen · Rot = Löschen') : 'Maus ziehen = Kamera drehen · Scrollrad = Zoom'}
        </div>
        {ansicht === '2d' && schritt === 1 && (
          <div onClick={() => { setZeichneWand(z => !z); setSelectedWandId(null); setSelectedId(null); setWandVorschau(null) }}
            style={{
              position: 'absolute', top: '16px', left: '16px', zIndex: 10, cursor: 'pointer',
              padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
              background: zeichneWand ? '#185FA5' : 'white', color: zeichneWand ? 'white' : '#444441',
              border: `1px solid ${zeichneWand ? '#185FA5' : '#E8E6E0'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
            {zeichneWand ? '✕ Zeichnen beenden' : '+ Trennwand zeichnen'}
          </div>
        )}
        {ansicht === '2d' && wandVorschau && (
          <div style={{
            position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: '20px', background: 'white',
            border: '1px solid #E8E6E0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontSize: '12px', color: '#444441', fontWeight: '500' }}>Trennwand bauen?</span>
            <div onClick={bestaetigeWand} style={{ cursor: 'pointer', padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: '500', background: '#185FA5', color: 'white' }}>Bauen</div>
            <div onClick={verwerfeWand} style={{ cursor: 'pointer', padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: '500', background: '#F7F6F2', color: '#888780', border: '1px solid #E8E6E0' }}>Verwerfen</div>
          </div>
        )}
        {ansicht === '2d' ? (
          <div id="canvas" style={{
            width: `${canvasB}px`, height: `${canvasT}px`,
            borderRadius: '6px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(24,95,165,0.08)',
            outline: '2px solid #B5D4F4',
            boxSizing: 'border-box',
          }}>
            {/* Wände einzeln einfärbbar — ein Streifen pro Wandsegment */}
            {wandSegmente.map(segment => (
              <div key={segment.index} style={{
                position: 'absolute', ...wandStreifenStyle(segment, wandDicke),
                background: wandFarbeFuer(activeRoom, HIMMELSRICHTUNG_JE_SEGMENT[segment.index] || 'nord'),
                zIndex: 3,
              }}></div>
            ))}

            <div ref={canvasInnerRef} className={`canvas-wrap ${activeRoom?.boden || 'boden-standard'}`} style={{ position: 'absolute', inset: `${wandDicke}px` }}>
            {/* Deselect Layer */}
            <div onClick={() => { setSelectedId(null); setSelectedWandId(null) }}
              onMouseDown={startWandZeichnen}
              onTouchStart={startWandZeichnen}
              style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: zeichneWand ? 'crosshair' : 'default', touchAction: zeichneWand ? 'none' : 'auto' }} />

            {/* Trennwände — nur in Schritt 1 "Raum" interaktiv, außerhalb bleiben sie sichtbar, aber unantastbar */}
            <svg width={innenB} height={innenT} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: (zeichneWand || schritt !== 1) ? 'none' : 'auto' }}>
              {trennwaende.map(wand => (
                <g key={wand.id}>
                  {selectedWandId === wand.id && (
                    <line x1={wand.x1} y1={wand.y1} x2={wand.x2} y2={wand.y2} stroke="#185FA5" strokeWidth={(wand.dicke || 10) + 6} strokeLinecap="square" opacity={0.25} pointerEvents="none" />
                  )}
                  <line x1={wand.x1} y1={wand.y1} x2={wand.x2} y2={wand.y2} stroke={wand.farbe} strokeWidth={wand.dicke || 10} strokeLinecap="square"
                    style={{ cursor: 'grab', pointerEvents: 'stroke', touchAction: 'none' }}
                    onMouseDown={(e) => handleWandDrag(e, wand.id, 'body')}
                    onTouchStart={(e) => handleWandDrag(e, wand.id, 'body')} />
                  {selectedWandId === wand.id && (
                    <>
                      {/* Sichtbarer Griff bleibt klein; unsichtbarer Kreis darunter liefert eine 44×44px-Trefferfläche für Touch */}
                      <circle cx={wand.x1} cy={wand.y1} r={22} fill="transparent" style={{ cursor: 'move', pointerEvents: 'all', touchAction: 'none' }}
                        onMouseDown={(e) => handleWandDrag(e, wand.id, 'start')} onTouchStart={(e) => handleWandDrag(e, wand.id, 'start')} />
                      <circle cx={wand.x1} cy={wand.y1} r={7} fill="white" stroke="#185FA5" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                      <circle cx={wand.x2} cy={wand.y2} r={22} fill="transparent" style={{ cursor: 'move', pointerEvents: 'all', touchAction: 'none' }}
                        onMouseDown={(e) => handleWandDrag(e, wand.id, 'end')} onTouchStart={(e) => handleWandDrag(e, wand.id, 'end')} />
                      <circle cx={wand.x2} cy={wand.y2} r={7} fill="white" stroke="#185FA5" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                    </>
                  )}
                </g>
              ))}
              {wandEntwurf && (
                <line x1={wandEntwurf.x1} y1={wandEntwurf.y1} x2={wandEntwurf.x2} y2={wandEntwurf.y2}
                  stroke="#185FA5" strokeWidth={10} strokeLinecap="square" strokeDasharray="6 5" opacity={0.7} pointerEvents="none" />
              )}
              {wandVorschau && (
                <>
                  <line x1={wandVorschau.x1} y1={wandVorschau.y1} x2={wandVorschau.x2} y2={wandVorschau.y2}
                    stroke="#185FA5" strokeWidth={16} strokeLinecap="square" opacity={0.25} pointerEvents="none" />
                  <line x1={wandVorschau.x1} y1={wandVorschau.y1} x2={wandVorschau.x2} y2={wandVorschau.y2}
                    stroke="#B4B2A9" strokeWidth={10} strokeLinecap="square" strokeDasharray="4 4" pointerEvents="none" />
                </>
              )}
            </svg>

            {fussleiste && (
              <>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
              </>
            )}
            {furniture.map(item => {
              const W = item.origWidth || item.width
              const H = item.origHeight || item.height
              const isEcksofa = item.name.toLowerCase().includes('ecksofa')
              const zeigeIcon = !item.istWandElement && !isEcksofa
              const typ = moebelIconTyp(item.name)
              const shapes = zeigeIcon ? moebelShapes(item.color, item.border) : null

              const pad = 2
              const armDepth = Math.max(0, (Math.min(W, H) - pad * 2) / 2)
              const x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad
              const strip = armDepth * (3.5 / 12)
              const lShapePath = `M${x0},${y0} L${x0 + armDepth},${y0} L${x0 + armDepth},${y1 - armDepth} L${x1},${y1 - armDepth} L${x1},${y1} L${x0},${y1} Z`
              const labelLeft = (x0 + armDepth + x1) / 2
              const labelTop = y1 - armDepth / 2

              return (
              <div key={item.id} style={{
                position: 'absolute',
                zIndex: 1,
                left: item.left + (() => {
                  const rad = (item.rotation || 0) * Math.PI / 180
                  return (W * Math.abs(Math.cos(rad)) + H * Math.abs(Math.sin(rad))) / 2
                })(),
                top: item.top + (() => {
                  const rad = (item.rotation || 0) * Math.PI / 180
                  return (W * Math.abs(Math.sin(rad)) + H * Math.abs(Math.cos(rad))) / 2
                })(),
                width: W,
                height: H,
                transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
              }}>
                <div onMouseDown={(e) => { handleDrag(e, item.id); setSelectedId(item.id) }}
                  onTouchStart={(e) => { handleDrag(e, item.id); setSelectedId(item.id) }}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(item.id) }}
                  style={{
                    width: '100%', height: '100%',
                    background: (isEcksofa || zeigeIcon) ? 'transparent' : item.color,
                    border: (isEcksofa || zeigeIcon) ? 'none' : `${item.istWandElement ? '3px' : '1.5px'} solid ${item.border}`,
                    borderRadius: item.istWandElement ? '3px' : '5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '500', cursor: 'grab', userSelect: 'none',
                    color: item.border, position: 'relative', transition: 'box-shadow 0.15s',
                    boxShadow: selectedId === item.id ? `0 0 0 2px #185FA5` : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${item.border}`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = selectedId === item.id ? '0 0 0 2px #185FA5' : 'none'}
                >
                  {isEcksofa ? (
                    <>
                      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <path d={lShapePath} fill={item.color} stroke={item.border} strokeWidth="1.3" strokeLinejoin="round" />
                        <rect x={x0} y={y0} width={strip} height={y1 - y0} fill={item.border} opacity="0.3" />
                        <rect x={x0} y={y1 - strip} width={x1 - x0} height={strip} fill={item.border} opacity="0.3" />
                      </svg>
                      <span style={{
                        position: 'absolute', left: labelLeft, top: labelTop, transform: 'translate(-50%, -50%)',
                        whiteSpace: 'nowrap', pointerEvents: 'none',
                      }}>{item.name}</span>
                    </>
                  ) : zeigeIcon ? (
                    <>
                      <svg viewBox="0 0 28 28" preserveAspectRatio="none"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        {shapes[typ] || shapes.standard}
                      </svg>
                      <span style={{ position: 'relative', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{item.name}</span>
                    </>
                  ) : item.name}
                  <span onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                    onClick={(e) => { e.stopPropagation(); removeFurniture(item.id); setSelectedId(null) }}
                    style={{ position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px', borderRadius: '50%', background: '#E24B4A', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>✕</span>
                </div>


              </div>
            )})}
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0 }}>
            <RoomView3D />
          </div>
        )}
      </div>

      <RotationsPanel />

      <TrennwandPanel />
    </>
  )
}
