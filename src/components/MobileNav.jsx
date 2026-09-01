import { useEffect, useRef, useState } from 'react'
import RaeumeTab from './RaeumeTab'
import MoebelTab from './MoebelTab'
import SchrittTab, { SchrittTabFooter } from './SchrittTab'
import { useUI } from '../context/UIContext'
import { useWizard } from '../context/WizardContext'
import { WIZARD_SCHRITTE } from '../constants'

// Ab dieser Zieh-Distanz (px) gilt der Wisch-nach-unten-Griff als "Sheet schließen" statt als
// unbeabsichtigtes Antippen/Zittern.
const ZIEH_SCHWELLE = 80

export default function MobileNav() {
  const { aktiverTab, setAktiverTab } = useUI()
  const { schritt } = useWizard()
  const aktuellerSchrittLabel = WIZARD_SCHRITTE.find(s => s.nummer === schritt)?.label

  const griffRef = useRef(null)
  const ziehOffsetRef = useRef(0)
  const [ziehOffset, setZiehOffset] = useState(0)

  // Nativer touchmove-Listener statt onTouchMove-Prop: React hängt Touch-Handler standardmäßig
  // passiv ein, wodurch preventDefault() dort wirkungslos bliebe und Safari die Geste weiterhin
  // als Seiten-Scroll/Pull-to-Refresh interpretieren würde.
  useEffect(() => {
    const griff = griffRef.current
    if (!griff) return
    let startY = 0
    let ziehend = false

    const onTouchStart = (e) => { startY = e.touches[0].clientY; ziehend = true }
    const onTouchMove = (e) => {
      if (!ziehend) return
      const deltaY = e.touches[0].clientY - startY
      if (deltaY > 0) {
        e.preventDefault()
        ziehOffsetRef.current = deltaY
        setZiehOffset(deltaY)
      }
    }
    const onTouchEnd = () => {
      ziehend = false
      if (ziehOffsetRef.current > ZIEH_SCHWELLE) setAktiverTab(null)
      ziehOffsetRef.current = 0
      setZiehOffset(0)
    }

    griff.addEventListener('touchstart', onTouchStart, { passive: true })
    griff.addEventListener('touchmove', onTouchMove, { passive: false })
    griff.addEventListener('touchend', onTouchEnd)
    return () => {
      griff.removeEventListener('touchstart', onTouchStart)
      griff.removeEventListener('touchmove', onTouchMove)
      griff.removeEventListener('touchend', onTouchEnd)
    }
  }, [setAktiverTab])

  return (
    <>
      {/* Mobile Overlay */}
      <div className={`drawer-overlay ${aktiverTab ? 'open' : ''}`} onClick={() => setAktiverTab(null)} />

      {/* Mobile Drawer */}
      <div
        className={`drawer ${aktiverTab ? 'open' : ''}`}
        style={ziehOffset ? { transform: `translateY(${ziehOffset}px)`, transition: 'none' } : undefined}
      >
        <div ref={griffRef} className="drawer-griff-zeile" style={{ padding: '12px 16px 0' }}>
          <div style={{ width: '40px', height: '4px', background: '#E8E6E0', borderRadius: '2px', margin: '0 auto 16px' }}></div>
        </div>
        <div className="drawer-scroll">
          {aktiverTab === 'raeume' && <RaeumeTab />}
          {aktiverTab === 'moebel' && <MoebelTab />}
          {aktiverTab === 'schritt' && <SchrittTab />}
        </div>
        {aktiverTab === 'schritt' && <SchrittTabFooter />}
      </div>

      {/* Mobile Tab Bar */}
      <div className="mobile-tabs">
        {[
          { id: 'raeume', icon: '🏠', label: 'Räume' },
          { id: 'moebel', icon: '🛋️', label: 'Möbel' },
        ].map(tab => (
          <div key={tab.id} onClick={() => setAktiverTab(aktiverTab === tab.id ? null : tab.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: aktiverTab === tab.id ? '#185FA5' : '#B4B2A9', transition: 'color 0.15s' }}>
            <div style={{ fontSize: '22px', marginBottom: '2px' }}>{tab.icon}</div>
            <div style={{ fontSize: '10px', fontWeight: aktiverTab === tab.id ? '500' : '400' }}>{tab.label}</div>
          </div>
        ))}
        <div onClick={() => setAktiverTab(aktiverTab === 'schritt' ? null : 'schritt')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: aktiverTab === 'schritt' ? '#185FA5' : '#B4B2A9', transition: 'color 0.15s' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '600', marginBottom: '2px', flexShrink: 0,
            background: aktiverTab === 'schritt' ? '#185FA5' : '#E8E6E0',
            color: aktiverTab === 'schritt' ? 'white' : '#888780',
          }}>{schritt}</div>
          <div style={{ fontSize: '10px', fontWeight: aktiverTab === 'schritt' ? '500' : '400', textAlign: 'center' }}>{aktuellerSchrittLabel}</div>
        </div>
      </div>
    </>
  )
}
