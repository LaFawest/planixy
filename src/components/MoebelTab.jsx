import KatalogPanel from './KatalogPanel'
import { useUI } from '../context/UIContext'

export default function MoebelTab() {
  const { setAktiverTab } = useUI()
  return (
    <div style={{ padding: '0 16px 24px' }}>
      <KatalogPanel spalten={3} onItemHinzugefuegt={() => setAktiverTab(null)} />
    </div>
  )
}
