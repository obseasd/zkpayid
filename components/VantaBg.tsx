'use client'

import { useEffect, useRef } from 'react'

export default function VantaBg() {
  const ref = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effect = useRef<any>(null)

  useEffect(() => {
    if (!ref.current || effect.current) return

    const loadVanta = async () => {
      try {
        const THREE = await import('three')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).THREE = THREE
        const WAVES = (await import('vanta/dist/vanta.waves.min')).default
        effect.current = WAVES({
          el: ref.current,
          THREE,
          color: 0x1a0a3e,
          shininess: 30,
          waveHeight: 12,
          waveSpeed: 0.8,
          zoom: 1.0,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
        })
      } catch (e) {
        console.warn('Vanta failed to load:', e)
      }
    }

    loadVanta()
    return () => { if (effect.current) effect.current.destroy() }
  }, [])

  return <div ref={ref} className="fixed inset-0 z-0" style={{ background: 'linear-gradient(165deg, #020617 0%, #0F172A 35%, #1E293B 70%, #0F172A 100%)' }} />
}
