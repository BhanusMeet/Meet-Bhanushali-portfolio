import { lazy, Suspense, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useScrollSpeedLimit } from '@/hooks/useScrollSpeedLimit'
import { AvatarRope } from '@/components/avatar/AvatarRope'
import { AvatarStunt } from '@/components/avatar/AvatarStunt'
import { AvatarFollower } from '@/components/avatar/AvatarFollower'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Projects } from '@/components/sections/Projects'
import { Hobbies } from '@/components/sections/Hobbies'
import { Contact } from '@/components/sections/Contact'

// Below the fold and the only home-page consumer of the Supabase client, so it loads separately.
const Testimonials = lazy(() => import('@/components/sections/Testimonials').then((m) => ({ default: m.Testimonials })))

export default function Home() {
  const reduce = useReducedMotion()
  const [stunting, setStunting] = useState(false)
  useScrollSpeedLimit(!reduce)
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <About />
        <Experience />
        <Skills />
        <Projects />
        <Hobbies />
        <Suspense fallback={<section id="testimonials" aria-hidden className="min-h-[22rem]" />}>
          <Testimonials />
        </Suspense>
        <Contact />
      </main>
      <Footer />
      {!reduce && (
        <>
          <AvatarFollower hidden={stunting} />
          <AvatarStunt onActive={setStunting} />
          <AvatarRope onActive={setStunting} />
        </>
      )}
    </>
  )
}
