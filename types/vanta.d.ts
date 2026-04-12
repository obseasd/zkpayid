declare module 'vanta/dist/vanta.waves.min' {
  interface VantaOptions {
    el: HTMLElement | null
    THREE: unknown
    color?: number
    shininess?: number
    waveHeight?: number
    waveSpeed?: number
    zoom?: number
    mouseControls?: boolean
    touchControls?: boolean
    gyroControls?: boolean
    minHeight?: number
    minWidth?: number
  }
  interface VantaEffect {
    destroy: () => void
  }
  export default function WAVES(opts: VantaOptions): VantaEffect
}
