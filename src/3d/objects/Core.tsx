import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ACCENT } from '../materials/colors'
import { OrbitRing } from './OrbitRing'

/** 0 at the top of the page, 1 once the first screen has scrolled away. */
const heroScroll = () => THREE.MathUtils.clamp(window.scrollY / window.innerHeight, 0, 1)

/**
 * The core is scroll-linked: scrolling spins it, pushes the rings outward and loosens the
 * wireframe shell, so the object visibly opens up as you leave the hero.
 */
export function Core({ animate, lowPower }: { animate: boolean; lowPower: boolean }) {
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Mesh>(null)
  const wire = useRef<THREE.Mesh>(null)
  const rings = useRef<THREE.Group>(null)
  const target = useMemo(() => new THREE.Vector2(), [])
  const viewport = useThree((s) => s.viewport)
  const fit = Math.min(1, Math.min(viewport.width, viewport.height) / 4.9)

  useFrame((state, dt) => {
    if (!group.current) return
    const sp = heroScroll()
    if (animate) {
      target.set(state.pointer.x * 0.45, -state.pointer.y * 0.3)
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target.x + sp * Math.PI * 1.2, 3, dt)
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, target.y + sp * 0.5, 3, dt)
      group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, -target.x * 0.25, 3, dt)
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.06
    }
    if (inner.current && animate) {
      inner.current.rotation.y += dt * 0.18
      inner.current.rotation.x += dt * 0.07
    }
    if (wire.current) {
      wire.current.scale.setScalar(1.28 + sp * 0.7)
      if (animate) wire.current.rotation.y -= dt * 0.08
    }
    if (rings.current) rings.current.scale.setScalar(1 + sp * 0.45)
  })

  return (
    <group scale={fit}>
      <group ref={group}>
        <mesh ref={inner}>
          <icosahedronGeometry args={[0.85, lowPower ? 1 : 2]} />
          <meshPhysicalMaterial color="#c4ccd4" metalness={0.9} roughness={0.28} clearcoat={0.5} clearcoatRoughness={0.3} flatShading envMapIntensity={1.6} />
        </mesh>
        <mesh ref={wire}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.22} toneMapped={false} />
        </mesh>
        <group ref={rings}>
          <OrbitRing radius={1.55} tilt={[1.25, 0.2, 0]} speed={0.35} tone="silver" tube={0.012} />
          <OrbitRing radius={1.85} tilt={[0.5, 0.9, 0.3]} speed={-0.22} tone="green" />
          {!lowPower && <OrbitRing radius={2.15} tilt={[1.9, -0.5, 0.8]} speed={0.15} tone="silver" tube={0.006} />}
        </group>
      </group>
    </group>
  )
}
