import * as THREE from 'three'

// === BELEUCHTUNG (Sonne, Himmelslicht, feste Deckenleuchte, Aufhellung) ===
export function baueBeleuchtung(scene, raumBreite, raumTiefe, wandHoehe) {
  const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.6)
  scene.add(ambientLight)

  // Schatten-Frustum an die tatsächliche Raumgröße anpassen (statt fixer ±10 Einheiten) –
  // so bleibt die Schattenkarte bei kleinen Räumen scharf und bei großen Räumen vollständig
  const schattenReichweite = Math.max(raumBreite, raumTiefe) / 2 + 2

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
  sunLight.position.set(raumBreite * 0.8, 8, raumTiefe * 0.8)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 4096
  sunLight.shadow.mapSize.height = 4096
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = schattenReichweite * 2 + 20
  sunLight.shadow.camera.left = -schattenReichweite
  sunLight.shadow.camera.right = schattenReichweite
  sunLight.shadow.camera.top = schattenReichweite
  sunLight.shadow.camera.bottom = -schattenReichweite
  sunLight.shadow.bias = -0.001
  sunLight.shadow.radius = 4
  sunLight.shadow.camera.updateProjectionMatrix()
  scene.add(sunLight)

  const windowLight = new THREE.DirectionalLight(0xc8e8ff, 0.6)
  windowLight.position.set(-raumBreite, 4, 0)
  scene.add(windowLight)

  const ceilingLight = new THREE.PointLight(0xfff8e6, 1.5, raumBreite * 3)
  ceilingLight.position.set(0, wandHoehe - 0.2, 0)
  ceilingLight.castShadow = true
  ceilingLight.shadow.mapSize.width = 1024
  ceilingLight.shadow.mapSize.height = 1024
  ceilingLight.shadow.bias = -0.002
  ceilingLight.shadow.radius = 3
  ceilingLight.shadow.camera.near = 0.1
  ceilingLight.shadow.camera.far = wandHoehe + Math.max(raumBreite, raumTiefe)
  scene.add(ceilingLight)

  const lampGeo = new THREE.SphereGeometry(0.12, 16, 16)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffde0 })
  const lamp = new THREE.Mesh(lampGeo, lampMat)
  lamp.position.set(0, wandHoehe - 0.1, 0)
  scene.add(lamp)

  const fillLight = new THREE.HemisphereLight(0xffffff, 0xC8A97A, 0.3)
  scene.add(fillLight)
}
