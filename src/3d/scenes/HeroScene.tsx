import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { ACCENT } from '../materials/colors'
import { Core } from '../objects/Core'

/** The hero scene: lighting rig, procedural environment and the scroll-linked core. Lazy-loaded by HeroVisual. */
export default function HeroScene({ running, animate, lowPower }: { running: boolean; animate: boolean; lowPower: boolean }) {
  return (
    <Canvas
      frameloop={!running ? 'never' : animate ? 'always' : 'demand'}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 38 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-4, -1, 2]} intensity={14} color={ACCENT} distance={12} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, -3]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 0, 2]} scale={[2, 6, 1]} color="#9dffc6" />
        <Lightformer form="rect" intensity={1.2} position={[5, -1, 3]} scale={[2, 5, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, -3, 3]} scale={4} />
        <Lightformer form="circle" intensity={1.4} position={[0, 0, 6]} scale={8} color="#cfd8e0" />
        <Lightformer form="rect" intensity={1.2} position={[0, -5, 0]} scale={[12, 2, 1]} />
      </Environment>
      <Core animate={animate} lowPower={lowPower} />
    </Canvas>
  )
}
