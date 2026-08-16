import * as THREE from 'three'

// === TRENNWÄNDE (frei gezeichnete Innenwände) ===
export function baueTrennwaende(scene, room, raumBreite, raumTiefe, wandHoehe) {
  const wandDicke = 8
  const innenBpx = raumBreite * 60 - wandDicke * 2
  const innenTpx = raumTiefe  * 60 - wandDicke * 2

  ;(room?.trennwaende || []).forEach(wand => {
    const x1 = -raumBreite / 2 + (wand.x1 / innenBpx) * raumBreite
    const z1 = -raumTiefe  / 2 + (wand.y1 / innenTpx) * raumTiefe
    const x2 = -raumBreite / 2 + (wand.x2 / innenBpx) * raumBreite
    const z2 = -raumTiefe  / 2 + (wand.y2 / innenTpx) * raumTiefe
    const laenge = Math.hypot(x2 - x1, z2 - z1)
    if (laenge < 0.05) return
    const trennwandDicke = (wand.dicke || 10) / 60
    const trennwandMat = new THREE.MeshStandardMaterial({ color: wand.farbe || '#B4B2A9', roughness: 0.9, metalness: 0.0 })
    const trennwandMesh = new THREE.Mesh(new THREE.BoxGeometry(laenge, wandHoehe, trennwandDicke), trennwandMat)
    trennwandMesh.position.set((x1 + x2) / 2, wandHoehe / 2, (z1 + z2) / 2)
    trennwandMesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
    trennwandMesh.castShadow = true
    trennwandMesh.receiveShadow = true
    scene.add(trennwandMesh)
  })
}
