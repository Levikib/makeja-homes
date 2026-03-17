'use client'

import { useEffect, useRef } from 'react'

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    let animId: number
    let THREE: any

    const load = async () => {
      // Dynamically import Three.js
      THREE = await import('three')
      init(THREE)
    }

    const init = (THREE: any) => {
      const canvas = canvasRef.current!
      const W = window.innerWidth
      const H = window.innerHeight

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setClearColor(0x131B1D, 1)

      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog(0x1A2628, 32, 72)

      const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 120)
      camera.position.set(9, 13, 20)
      camera.lookAt(0, 3, 0)

      // ── LIGHTS
      scene.add(new THREE.AmbientLight(0xC2D6D8, 0.45))

      const sun = new THREE.DirectionalLight(0xFFE4C0, 1.3)
      sun.position.set(12, 24, 12)
      sun.castShadow = true
      sun.shadow.mapSize.width = sun.shadow.mapSize.height = 2048
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 80
      sun.shadow.camera.left = -25; sun.shadow.camera.right = 25
      sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25
      sun.shadow.bias = -0.001
      scene.add(sun)

      const ptTerra = new THREE.PointLight(0xE27D60, 2.0, 18)
      ptTerra.position.set(0, 2, 4)
      scene.add(ptTerra)

      const ptGold = new THREE.PointLight(0xC9A84C, 0.9, 22)
      ptGold.position.set(-6, 10, -4)
      scene.add(ptGold)

      // ── GROUND
      const gnd = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: 0x1A2C2E, roughness: 0.92, metalness: 0.04 })
      )
      gnd.rotation.x = -Math.PI / 2
      gnd.receiveShadow = true
      scene.add(gnd)

      // ── CITY
      const city = new THREE.Group()
      scene.add(city)

      const C = {
        slate: 0x3E4E50, slateM: 0x566E70, slateL: 0x8EA8AA,
        terra: 0xE27D60, terraL: 0xEBA08A, terraD: 0xC4614A,
        gold: 0xC9A84C, cream: 0xD0CBC3, dark: 0x1E2C2E, char2: 0x222E30
      }

      const bld = (w: number, h: number, d: number, col: number, x: number, z: number) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.68, metalness: 0.14 })
        )
        mesh.position.set(x, h / 2, z)
        mesh.castShadow = true
        mesh.receiveShadow = true
        city.add(mesh)
        return mesh
      }

      // Central cluster
      bld(1.2, 7.8, 1.2, C.slate,   0,    0)
      bld(1.0, 11.0, 1.0, C.terra,  2.3,  0.4)
      bld(1.5, 5.5, 1.5, C.slateM, -2.1,  0.7)
      bld(0.9, 8.5, 0.9, C.gold,    1.1, -2.2)
      bld(1.3, 6.2, 1.3, C.terraD, -1.3, -2.8)
      // Mid ring
      bld(1.8, 4.2, 1.4, C.slateL,  4.6,  1.6)
      bld(1.3, 4.8, 1.3, C.terraL, -4.2,  1.1)
      bld(1.6, 3.6, 1.2, C.cream,   3.3, -3.6)
      bld(1.2, 5.2, 1.2, C.slate,  -4.0, -3.2)
      bld(2.0, 3.2, 1.8, C.terra,   0.6,  4.6)
      bld(1.1, 6.8, 1.1, C.gold,   -1.1, -5.2)
      bld(1.4, 3.0, 1.4, C.slateM,  5.8, -1.2)
      // Outer ring
      bld(1.4, 2.6, 1.4, C.slateL,  6.8,  3.6)
      bld(1.2, 2.2, 1.2, C.terraL, -6.2,  2.6)
      bld(1.6, 3.2, 1.4, C.char2,   5.6, -5.2)
      bld(1.8, 2.6, 1.5, C.dark,   -5.8, -5.8)
      bld(1.0, 2.1, 1.0, C.terra,   7.2, -2.1)
      bld(1.4, 3.6, 1.4, C.slate,  -7.8, -1.6)
      bld(2.2, 1.6, 2.0, C.cream,   2.6,  6.2)
      bld(1.2, 2.8, 1.2, C.gold,   -2.4,  5.8)
      bld(1.6, 2.0, 1.6, C.slateM,  8.0,  0.5)
      bld(1.0, 1.8, 1.0, C.terraD, -8.5,  1.8)

      // ── MOUSE
      let mx = 0, my = 0
      const onMouse = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2
        my = (e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener('mousemove', onMouse)

      // ── RESIZE
      const onResize = () => {
        const W2 = window.innerWidth, H2 = window.innerHeight
        camera.aspect = W2 / H2; camera.updateProjectionMatrix()
        renderer.setSize(W2, H2)
      }
      window.addEventListener('resize', onResize)

      // ── ANIMATE
      let t = 0
      const heroEl = document.getElementById('hero')

      const animate = () => {
        animId = requestAnimationFrame(animate)
        if (!heroEl) return
        const rect = heroEl.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return

        t += 0.005
        city.rotation.y = t * 0.12
        camera.position.x = 9 + mx * 1.5
        camera.position.y = 13 - my * 1.0
        camera.lookAt(0, 3, 0)
        ptTerra.intensity = 1.8 + Math.sin(t * 2.2) * 0.4

        renderer.render(scene, camera)
      }
      animate()

      // Cleanup
      return () => {
        window.removeEventListener('mousemove', onMouse)
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(animId)
        renderer.dispose()
      }
    }

    load()
    return () => { cancelAnimationFrame(animId) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="three-canvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
