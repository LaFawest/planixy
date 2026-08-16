import { initialRooms } from '../constants'

export const loadRooms = () => {
  const saved = localStorage.getItem('planixy-rooms')
  return saved ? JSON.parse(saved) : initialRooms
}

export const maxId = (werte) => werte.reduce((max, w) => typeof w === 'number' && w > max ? w : max, 0)
