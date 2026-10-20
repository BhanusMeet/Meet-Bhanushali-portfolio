import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { ACCENT } from '../materials/colors'

/** A thin ring with a small glowing satellite travelling along it. */
export function OrbitRing({ radius, tilt, speed, tone, tube = 0.008 }: { radius: number; tilt: [number, number, number]; speed: number; tone: 'silver' | 'green'; tube?: number }) {
  const sat = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (sat.current) sat.current.rotation.z += dt * speed
  })
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, tube, 12, 160]} />
        {tone === 'green' ? <meshBasicMaterial color={ACCENT} transparent opacity={0.55} toneMapped={false} /> : <meshStandardMaterial color="#c9d1da" metalness={1} roughness={0.25} />}
      </mesh>
      <group ref={sat}>
        <mesh position={[radius, 0, 0]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={tone === 'green' ? ACCENT : '#ffffff'} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
