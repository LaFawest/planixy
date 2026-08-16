import * as THREE from 'three'

export function erzeugeHolzTextur() {
  const groesse = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * groesse
    const dunkel = 0.08 + Math.random() * 0.16
    ctx.strokeStyle = `rgba(90,60,25,${dunkel.toFixed(2)})`
    ctx.lineWidth = 0.6 + Math.random() * 1.8
    ctx.beginPath()
    let x = 0
    ctx.moveTo(x, y)
    while (x < groesse) {
      x += 6
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (Math.random() - 0.5) * 1.5)
    }
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function erzeugeStoffTextur() {
  const groesse = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, groesse, groesse)
  const zellen = 24
  const zellGroesse = groesse / zellen
  for (let y = 0; y < zellen; y++) {
    for (let x = 0; x < zellen; x++) {
      const hell = 222 + Math.floor(Math.random() * 30)
      ctx.fillStyle = `rgb(${hell},${hell},${hell})`
      ctx.fillRect(x * zellGroesse, y * zellGroesse, zellGroesse, zellGroesse)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function erzeugeBodenTextur(bodenTyp, breiteM, tiefeM) {
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = getBodenFarbe(bodenTyp)
  ctx.fillRect(0, 0, groesse, groesse)

  if (bodenTyp === 'boden-parkett' || bodenTyp === 'boden-laminat') {
    const dielenBreite = groesse / 10
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 24; j++) {
        const x = i * dielenBreite + Math.random() * dielenBreite
        const y = Math.random() * groesse
        ctx.strokeStyle = `rgba(70,40,15,${(0.05 + Math.random() * 0.1).toFixed(2)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 10, y + 20 + Math.random() * 30)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = 'rgba(60,35,10,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath()
      ctx.moveTo(i * dielenBreite, 0)
      ctx.lineTo(i * dielenBreite, groesse)
      ctx.stroke()
    }
  } else if (bodenTyp === 'boden-fliesen') {
    const fliesenAnzahl = 6
    const fliesenGroesse = groesse / fliesenAnzahl
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.08).toFixed(2)})`
      ctx.fillRect(x, y, 2, 2)
    }
    ctx.strokeStyle = 'rgba(150,145,135,0.8)'
    ctx.lineWidth = 3
    for (let i = 0; i <= fliesenAnzahl; i++) {
      ctx.beginPath(); ctx.moveTo(i * fliesenGroesse, 0); ctx.lineTo(i * fliesenGroesse, groesse); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * fliesenGroesse); ctx.lineTo(groesse, i * fliesenGroesse); ctx.stroke()
    }
  } else if (bodenTyp === 'boden-teppich') {
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      const hell = Math.random() * 40 - 20
      ctx.fillStyle = hell > 0 ? `rgba(255,255,255,${(hell / 100).toFixed(2)})` : `rgba(0,0,0,${(-hell / 100).toFixed(2)})`
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  } else if (bodenTyp === 'boden-beton') {
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      const r = 5 + Math.random() * 20
      const hell = Math.random() > 0.5
      ctx.fillStyle = hell ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
  } else {
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      ctx.fillStyle = `rgba(0,0,0,${(Math.random() * 0.02).toFixed(2)})`
      ctx.fillRect(x, y, 2, 2)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(Math.max(1, Math.round(breiteM)), Math.max(1, Math.round(tiefeM)))
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function erzeugeUmgebungsTextur() {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 16)
  gradient.addColorStop(0, '#dfe9f0')
  gradient.addColorStop(0.5, '#f5f4f0')
  gradient.addColorStop(1, '#c9c2b0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 16, 16)
  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function getBodenFarbe(boden) {
  const farben = {
    'boden-parkett':  '#C8A97A',
    'boden-laminat':  '#D4B896',
    'boden-fliesen':  '#E8E4DC',
    'boden-teppich':  '#C4B8D4',
    'boden-beton':    '#B8B8B4',
    'boden-standard': '#F5F4F0',
  }
  return farben[boden] || '#F5F4F0'
}

export function getMoebelHoehe(name) {
  const hoehen = {
    'Sofa': 0.4, 'Sessel': 0.4, 'Sofa 2-Sitzer': 0.4, 'Sofa 3-Sitzer': 0.4, 'Ecksofa': 0.42,
    'Einzelbett': 0.6, 'Doppelbett': 0.6, 'Boxspringbett': 0.65,
    'Esstisch': 0.75, 'Couchtisch': 0.45,
    'Schreibtisch': 0.75, 'TV-Board': 0.5, 'Sideboard': 0.8,
    'Kleiderschrank': 2.1, 'Regal': 1.8, 'Bücherregal': 1.8,
    'Kühlschrank': 1.8, 'Herd': 0.9, 'Spüle': 0.9,
    'WC': 0.8, 'Badewanne': 0.6, 'Dusche': 2.0,
    'Waschmaschine': 0.85, 'Pflanze': 1.2, 'Großpflanze': 1.8,
    'Lampe': 1.5, 'Stehlampe': 1.7, 'TV': 0.1,
    'Lautsprecher': 0.4, 'Spielekonsole': 0.08, 'Laptop': 0.02,
    'Router': 0.04, 'Toaster': 0.2, 'Wasserkocher': 0.25,
    'Kaffeemaschine': 0.35, 'Ventilator': 0.9,
    'Teppich klein': 0.02, 'Teppich groß': 0.02, 'Bild': 0.03,
    'Sitzbank': 0.45, 'Barhocker': 0.75, 'Sofa 1-Sitzer': 0.4, 'Schminktisch': 0.75, 'Bettbank': 0.45,
    'Rollcontainer': 0.6, 'Konferenztisch': 0.75, 'Backofen': 0.6, 'Dunstabzugshaube': 0.15,
    'Duschkabine Eck': 2.0, 'Bidet': 0.8,
    'Vase': 0.3, 'Kerzenständer': 0.25, 'Wanduhr': 0.03, 'Kissen': 0.15,
    'Globus': 0.4, 'Skulptur': 0.5, 'Kaktus': 0.6, 'Lichterkette': 0.05,
    'Deckenlampe': 0.3, 'Pendelleuchte': 0.35, 'Wandleuchte': 0.2, 'Kronleuchter': 0.45, 'Tischlampe': 0.45,
  }
  return hoehen[name] || 0.75
}
