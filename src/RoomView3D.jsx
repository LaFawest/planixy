import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function RoomView3D({ room, furniture }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const width = mount.clientWidth
    const height = mount.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#F5F4F0')

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(8, 10, 12)
    camera.lookAt(0, 0, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // Lichter
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    scene.add(dirLight)

    // Raum Dimensionen
    const raumBreite = (room?.breite || 6)
    const raumTiefe  = (room?.tiefe  || 5)
    const wandHoehe  = 3

    // Boden
    const bodenGeo = new THREE.PlaneGeometry(raumBreite, raumTiefe)
    const bodenMat = new THREE.MeshLambertMaterial({
      color: getBodenFarbe(room?.boden),
    })
    const boden = new THREE.Mesh(bodenGeo, bodenMat)
    boden.rotation.x = -Math.PI / 2
    boden.receiveShadow = true
    scene.add(boden)

    // Wände
    const wandFarbe = room?.wandfarbe || '#FFFFFF'
    const wandMat = new THREE.MeshLambertMaterial({ color: wandFarbe, side: THREE.BackSide })

    // Hinterwand
    const wand1Geo = new THREE.PlaneGeometry(raumBreite, wandHoehe)
    const wand1 = new THREE.Mesh(wand1Geo, wandMat)
    wand1.position.set(0, wandHoehe / 2, -raumTiefe / 2)
    scene.add(wand1)

    // Seitenwand
    const wand2Geo = new THREE.PlaneGeometry(raumTiefe, wandHoehe)
    const wand2 = new THREE.Mesh(wand2Geo, wandMat)
    wand2.position.set(-raumBreite / 2, wandHoehe / 2, 0)
    wand2.rotation.y = Math.PI / 2
    scene.add(wand2)

    // Wand Kanten
    const kantenMat = new THREE.LineBasicMaterial({ color: '#D3D1C7' })

    // Möbel
    furniture.forEach(item => {
      const moebelBreite = item.width  / 60
      const moebelTiefe  = item.height / 60
      const moebelHoehe  = getMoebelHoehe(item.name)

      const geo = new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe)
      const mat = new THREE.MeshLambertMaterial({ color: item.color })
      const mesh = new THREE.Mesh(geo, mat)

      // Position umrechnen (Canvas px → 3D Koordinaten)
      const x = (item.left / 60) - raumBreite  / 2 + moebelBreite / 2
      const z = (item.top  / 60) - raumTiefe   / 2 + moebelTiefe  / 2

      mesh.position.set(x, moebelHoehe / 2, z)
      mesh.rotation.y = -(item.rotation || 0) * Math.PI / 180
      mesh.castShadow = true
      mesh.receiveShadow = true

      // Kante
      const edges = new THREE.EdgesGeometry(geo)
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: item.border }))
      line.position.copy(mesh.position)
      line.rotation.copy(mesh.rotation)

      scene.add(mesh)
      scene.add(line)
    })

    // Kamera Steuerung (Maus)
    let isDragging = false
    let previousMouse = { x: 0, y: 0 }
    let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 18 }

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
      camera.position.y = spherical.radius * Math.cos(spherical.phi)
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      camera.lookAt(0, 0, 0)
    }
    updateCamera()

    const onMouseDown = (e) => { isDragging = true; previousMouse = { x: e.clientX, y: e.clientY } }
    const onMouseUp   = () => { isDragging = false }
    const onMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - previousMouse.x
      const dy = e.clientY - previousMouse.y
      spherical.theta -= dx * 0.01
      spherical.phi   = Math.max(0.1, Math.min(Math.PI / 2, spherical.phi + dy * 0.01))
      previousMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e) => {
      spherical.radius = Math.max(5, Math.min(30, spherical.radius + e.deltaY * 0.05))
      updateCamera()
    }

    mount.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    mount.addEventListener('wheel', onWheel)

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      mount.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('wheel', onWheel)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [room, furniture])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  )
}

function getBodenFarbe(boden) {
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

function getMoebelHoehe(name) {
  const hoehen = {
    'Sofa': 0.85, 'Sessel': 0.85, 'Bett': 0.6, 'Einzelbett': 0.6,
    'Doppelbett': 0.6, 'Tisch': 0.75, 'Esstisch': 0.75, 'Couchtisch': 0.45,
    'Schreibtisch': 0.75, 'TV-Board': 0.5, 'Sideboard': 0.8,
    'Kleiderschrank': 2.1, 'Regal': 1.8, 'Bücherregal': 1.8,
    'Kühlschrank': 1.8, 'Herd': 0.9, 'Spüle': 0.9,
    'WC': 0.8, 'Badewanne': 0.6, 'Dusche': 2.0,
    'Waschmaschine': 0.85, 'Pflanze': 1.2, 'Großpflanze': 1.8,
    'Lampe': 1.5, 'Stehlampe': 1.7, 'TV': 0.1,
  }
  return hoehen[name] || 0.75
}