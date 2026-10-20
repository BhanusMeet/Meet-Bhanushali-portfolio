import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity, type MotionValue } from 'framer-motion'

/**
 * Cartoon avatar of Meet, hand-drawn as layered SVG from the supplied photo.
 *  - Pointer: head and body shift by different amounts (parallax).
 *  - Scroll (optional `scroll` driver): a gentle step cycle driven by scroll DISTANCE, so the stride
 *    matches how far you scroll.
 *  - `mood` and `rubbing` are used by the click stunt and the fast-scroll gag.
 * Everything is static under prefers-reduced-motion.
 */
const OUT = '#0f1b20'
const SKIN = '#e0a982'
const SKIN_SHADE = '#c58963'
const HAIR = '#17110f'
const KURTA = '#8fcad6'
const KURTA_LIGHT = '#d8eff3'
const KURTA_DARK = '#5aa3b3'
const WHITE = '#f6f7f5'
const WHITE_SHADE = '#d3d9d6'

const outline = { stroke: OUT, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

export type Mood = 'happy' | 'ouch' | 'dizzy'

export function Avatar({
  className,
  scroll,
  decorative = false,
  mood = 'happy',
  rubbing = false,
  hanging = false,
  running = false,
}: {
  className?: string
  scroll?: MotionValue<number>
  decorative?: boolean
  mood?: Mood
  rubbing?: boolean
  /** Both arms up, holding a cable (back-to-top). */
  hanging?: boolean
  /** Sprinting in place: big strides, forward lean, sweat and speed lines. */
  running?: boolean
}) {
  const reduce = useReducedMotion()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 90, damping: 18 })
  const sy = useSpring(py, { stiffness: 90, damping: 18 })
  const fallback = useMotionValue(0)
  const driver = scroll ?? fallback
  const velocity = useSpring(useVelocity(driver), { stiffness: 80, damping: 26 })
  const on = !reduce && !!scroll
  const runRef = useRef(running)
  runRef.current = running
  const runPhase = useMotionValue(0)
  // The stride clock only ticks while he is actually running (no idle per-frame work).
  useEffect(() => {
    if (!running) return
    let raf = requestAnimationFrame(function loop(t) {
      runPhase.set(t / 65)
      raf = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(raf)
  }, [running, runPhase])

  useEffect(() => {
    if (reduce) return
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * 2)
      py.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduce, px, py])

  const headX = useTransform(sx, (v) => (reduce ? 0 : v * 8))
  const headY = useTransform(sy, (v) => (reduce ? 0 : v * 4))
  const headRot = useTransform([sx, velocity] as const, ([v, vel]: number[]) => (reduce ? 0 : v * 4 + (on ? Math.max(-3, Math.min(3, vel / 900)) : 0)))
  const bodyX = useTransform(sx, (v) => (reduce ? 0 : v * 4))
  const shadowX = useTransform(sx, (v) => (reduce ? 0 : -v * 5))

  // Walking: phase advances with scroll distance (one stride per ~70px).
  const phase = useTransform(driver, (s) => s / 34)
  const run = () => runRef.current
  const stepL = useTransform([phase, runPhase] as const, ([p, rp]: number[]) => (run() ? Math.sin(rp) * 30 : on ? Math.sin(p) * 8 : 0))
  const stepR = useTransform([phase, runPhase] as const, ([p, rp]: number[]) => (run() ? -Math.sin(rp) * 30 : on ? -Math.sin(p) * 8 : 0))
  const liftL = useTransform([phase, runPhase] as const, ([p, rp]: number[]) => (run() ? -Math.max(0, Math.sin(rp)) * 9 : on ? -Math.max(0, Math.sin(p)) * 3 : 0))
  const liftR = useTransform([phase, runPhase] as const, ([p, rp]: number[]) => (run() ? -Math.max(0, -Math.sin(rp)) * 9 : on ? -Math.max(0, -Math.sin(p)) * 3 : 0))
  const bobRaw = useTransform([phase, runPhase] as const, ([p, rp]: number[]) => (run() ? -Math.abs(Math.sin(rp)) * 6 : on ? -Math.abs(Math.sin(p)) * 1.6 : 0))
  const bob = useSpring(bobRaw, { stiffness: 260, damping: 22 })
  const lean = useTransform([velocity, runPhase] as const, ([vel]: number[]) => (run() ? 8 : on ? Math.max(-3, Math.min(3, vel / 700)) : 0))

  return (
    <svg
      viewBox="0 0 300 490"
      className={className}
      style={{ overflow: 'visible' }}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Cartoon illustration of Meet Bhanushali smiling' })}
    >
      <defs>
        <clipPath id="kurta-clip">
          <path d="M96,210 C120,200 180,200 204,210 L224,352 C180,364 120,364 76,352 Z" />
        </clipPath>
      </defs>

      <motion.ellipse style={{ x: shadowX }} cx="152" cy="484" rx="86" ry="9" fill="#000" opacity="0.45" />

      <motion.g style={{ y: bob, rotate: lean, originX: '150px', originY: '480px' }}>
        {/* legs: one standing pose, with a small step while scrolling (sway when hanging) */}
        <motion.g
          animate={hanging ? { rotate: [-5, 5, -5] } : { rotate: 0 }}
          transition={hanging ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          style={{ originX: '150px', originY: '350px' }}
        >
        <motion.g style={{ rotate: stepR, y: liftR, originX: '177px', originY: '350px' }}>
          <path d="M152,350 L202,350 C200,392 194,428 190,460 L158,460 C156,428 152,392 152,350 Z" fill={WHITE} {...outline} />
          <path d="M172,380 C174,404 175,430 175,450" fill="none" stroke={WHITE_SHADE} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="177" cy="468" rx="22" ry="9" fill={SKIN} {...outline} strokeWidth={2.5} />
        </motion.g>
        <motion.g style={{ rotate: stepL, y: liftL, originX: '123px', originY: '350px' }}>
          <path d="M148,350 L98,350 C100,392 106,428 110,460 L142,460 C144,428 148,392 148,350 Z" fill={WHITE} {...outline} />
          <path d="M128,380 C126,404 125,430 125,450" fill="none" stroke={WHITE_SHADE} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="123" cy="468" rx="22" ry="9" fill={SKIN} {...outline} strokeWidth={2.5} />
        </motion.g>
        </motion.g>

        {/* torso */}
        <motion.g style={{ x: bodyX }}>
          <path d="M96,210 C120,200 180,200 204,210 L224,352 C180,364 120,364 76,352 Z" fill={KURTA} />
          <g clipPath="url(#kurta-clip)" fill="none" strokeLinecap="round">
            {[228, 262, 296, 330, 364].map((y, i) => (
              <path key={y} d={`M50,${y} q30,-20 56,0 t60,0 t60,0 t60,0`} stroke={i % 2 ? KURTA_DARK : KURTA_LIGHT} strokeWidth={i % 2 ? 4 : 8} opacity={i % 2 ? 0.55 : 0.85} />
            ))}
            <path d="M180,200 L240,200 L240,370 L200,370 Z" fill="#06202a" stroke="none" opacity="0.1" />
          </g>
          <path d="M96,210 C120,200 180,200 204,210 L224,352 C180,364 120,364 76,352 Z" fill="none" {...outline} />
          <path d="M150,214 L150,284" stroke={KURTA_DARK} strokeWidth="3" />
          {[232, 252, 272].map((y) => (
            <circle key={y} cx="150" cy={y} r="3.6" fill="#16323b" stroke={OUT} strokeWidth="1" />
          ))}

          {/* sleeves, hands tucked behind the back */}
          {!hanging && <path d="M96,210 C72,228 64,284 68,322 L98,328 C100,282 106,246 118,220 Z" fill={KURTA} {...outline} />}
          {!rubbing && !hanging && <path d="M204,210 C228,228 236,284 232,322 L202,328 C200,282 194,246 182,220 Z" fill={KURTA} {...outline} />}
          {!hanging && <path d="M68,322 L98,328 L99,342 L66,336 Z" fill={WHITE} {...outline} strokeWidth={2.5} />}
          {!rubbing && !hanging && <path d="M232,322 L202,328 L201,342 L234,336 Z" fill={WHITE} {...outline} strokeWidth={2.5} />}

          {/* collar */}
          <path d="M150,208 L122,196 L110,224 L146,230 Z" fill={KURTA_LIGHT} {...outline} strokeWidth={2.5} />
          <path d="M150,208 L178,196 L190,224 L154,230 Z" fill={KURTA_LIGHT} {...outline} strokeWidth={2.5} />
        </motion.g>

        {/* neck */}
        <motion.g style={{ x: bodyX }}>
          <path d="M132,182 L168,182 L170,212 Q150,226 130,212 Z" fill={SKIN_SHADE} {...outline} strokeWidth={2.5} />
        </motion.g>

        {/* head */}
        <motion.g style={{ x: headX, y: headY, rotate: headRot, originX: '150px', originY: '200px' }}>
          <ellipse cx="73" cy="124" rx="11" ry="16" fill={SKIN} {...outline} strokeWidth={2.5} />
          <ellipse cx="227" cy="124" rx="11" ry="16" fill={SKIN} {...outline} strokeWidth={2.5} />
          <path d="M74,112 C74,60 108,34 150,34 C192,34 226,60 226,112 C226,170 196,200 150,200 C104,200 74,170 74,112 Z" fill={SKIN} {...outline} />
          <path d="M68,116 C54,56 94,14 152,12 C210,12 248,54 232,116 C228,94 216,74 198,66 C176,80 132,82 102,70 C84,80 72,98 68,116 Z" fill={HAIR} {...outline} />
          <path d="M72,100 C70,122 74,138 80,148 L88,132 C84,118 84,108 90,96 Z M228,100 C230,122 226,138 220,148 L212,132 C216,118 216,108 210,96 Z" fill={HAIR} />
          <path d="M96,40 C124,24 166,22 196,38 M86,62 C96,52 106,46 116,42" fill="none" stroke="#4a3f38" strokeWidth="5" strokeLinecap="round" opacity="0.7" />

          {/* brows */}
          {mood === 'ouch' ? (
            <path d="M100,92 Q120,100 141,88 M159,88 Q180,100 200,92" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
          ) : (
            <path d="M101,98 Q120,84 141,95 M159,95 Q180,84 199,98" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
          )}

          {/* eyes */}
          {mood === 'happy' && (
            <>
              <ellipse cx="122" cy="121" rx="8.5" ry="10.5" fill="#1b1411" />
              <ellipse cx="178" cy="121" rx="8.5" ry="10.5" fill="#1b1411" />
              <circle cx="125" cy="117" r="3.2" fill="#fff" />
              <circle cx="181" cy="117" r="3.2" fill="#fff" />
              <circle cx="119" cy="125" r="1.4" fill="#fff" opacity="0.8" />
              <circle cx="175" cy="125" r="1.4" fill="#fff" opacity="0.8" />
            </>
          )}
          {mood === 'ouch' && (
            <path d="M108,112 L132,122 L108,132 M192,112 L168,122 L192,132" fill="none" stroke="#1b1411" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {mood === 'dizzy' && (
            <g fill="none" stroke="#1b1411" strokeWidth="4" strokeLinecap="round">
              <circle cx="122" cy="121" r="11" fill="#fff" />
              <path d="M122,121 m0,-3 a3,3 0 1 1 -3,3 a6,6 0 1 1 6,-6" />
              <circle cx="178" cy="121" r="11" fill="#fff" />
              <path d="M178,121 m0,-3 a3,3 0 1 1 -3,3 a6,6 0 1 1 6,-6" />
            </g>
          )}

          <path d="M150,126 Q142,146 154,148" fill="none" stroke={SKIN_SHADE} strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="98" cy="150" r="13" fill="#e8806f" opacity={mood === 'happy' ? 0.3 : 0.5} />
          <circle cx="202" cy="150" r="13" fill="#e8806f" opacity={mood === 'happy' ? 0.3 : 0.5} />
          <path d="M124,154 Q150,145 176,154" fill="none" stroke="#5e4034" strokeWidth="4.5" strokeLinecap="round" opacity="0.45" />

          {/* mouth */}
          {mood === 'happy' && (
            <>
              <path d="M118,158 Q150,194 182,158 Q150,168 118,158 Z" fill="#7a2e2a" {...outline} strokeWidth={2.5} />
              <path d="M126,162 Q150,178 174,162 Q150,168 126,162 Z" fill="#fff" />
              <path d="M112,160 q-4,6 0,12 M188,160 q4,6 0,12" fill="none" stroke={SKIN_SHADE} strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}
          {mood === 'ouch' && <path d="M126,176 Q138,164 150,176 T174,176" fill="none" stroke="#7a2e2a" strokeWidth="6" strokeLinecap="round" />}
          {mood === 'dizzy' && <ellipse cx="150" cy="172" rx="14" ry="10" fill="#7a2e2a" {...outline} strokeWidth={2.5} />}
        </motion.g>

        {/* both arms up, gripping the cable above his head */}
        {hanging && (
          <g>
            {['M98,218 Q4,110 140,-52', 'M202,218 Q296,110 160,-52'].map((d) => (
              <g key={d}>
                <path d={d} fill="none" stroke={OUT} strokeWidth="34" strokeLinecap="round" />
                <path d={d} fill="none" stroke={KURTA} strokeWidth="28" strokeLinecap="round" />
              </g>
            ))}
            <circle cx="141" cy="-58" r="16" fill={SKIN} {...outline} strokeWidth={2.5} />
            <circle cx="159" cy="-58" r="16" fill={SKIN} {...outline} strokeWidth={2.5} />
          </g>
        )}

        {/* running: sweat and speed lines */}
        {running && (
          <g>
            <motion.path
              d="M236,70 q-9,16 0,22 q9,-6 0,-22 Z"
              fill="#8fd3ff"
              stroke={OUT}
              strokeWidth="2"
              animate={{ y: [0, 22], opacity: [1, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
            {[150, 230, 310].map((y, i) => (
              <motion.path
                key={y}
                d={`M-30,${y} L-95,${y}`}
                stroke="#e9ecea"
                strokeWidth="5"
                strokeLinecap="round"
                animate={{ opacity: [0, 0.8, 0], x: [10, -20] }}
                transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </g>
        )}

        {/* raised arm and hand: rubbing the head */}
        {rubbing && (
          <motion.g
            animate={{ x: [0, 14, 0, -14, 0], y: [0, -4, 0, -4, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M204,222 Q262,150 196,40" fill="none" stroke={OUT} strokeWidth="34" strokeLinecap="round" />
            <path d="M204,222 Q262,150 196,40" fill="none" stroke={KURTA} strokeWidth="28" strokeLinecap="round" />
            <circle cx="196" cy="30" r="17" fill={SKIN} {...outline} strokeWidth={2.5} />
            <path d="M186,22 q4,-6 8,-2 M198,20 q4,-6 8,-1" fill="none" stroke={SKIN_SHADE} strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        )}
      </motion.g>
    </svg>
  )
}
