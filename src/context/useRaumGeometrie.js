import { WAND_DICKE_PX } from '../constants'
import { useRooms } from './RoomsContext'
import { useDesign } from './DesignContext'

export function useRaumGeometrie() {
  const { activeRoom } = useRooms()
  const { fussleiste } = useDesign()

  const canvasB = (activeRoom?.breite || 6) * 60
  const canvasT = (activeRoom?.tiefe  || 5) * 60
  const wandDicke = WAND_DICKE_PX
  const innenB = canvasB - wandDicke * 2
  const innenT = canvasT - wandDicke * 2
  const fussleisteBreite = fussleiste ? 8 : 0
  const grenzB = innenB - fussleisteBreite * 2
  const grenzT = innenT - fussleisteBreite * 2
  const grenzStart = fussleisteBreite

  return { canvasB, canvasT, wandDicke, innenB, innenT, grenzB, grenzT, grenzStart }
}
