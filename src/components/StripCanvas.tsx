import { useEffect, useRef, useState } from 'react'
import { loadImage } from '../lib/images'
import { composeTemplate, type Template } from '../lib/templates'

/** Naikkan angka ini saat font web selesai dimuat supaya canvas digambar ulang. */
function useFontsTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => alive && setTick((t) => t + 1))
    return () => {
      alive = false
    }
  }, [])
  return tick
}

type Props = {
  template: Template
  /** data-URL per slot; null = slot kosong (ditampilkan placeholder) */
  photos: (string | null)[]
  /** lebar maksimum piksel canvas (kualitas preview) */
  maxWidth?: number
  className?: string
  label?: string
  /** tampilkan nomor pada slot kosong */
  numbers?: boolean
}

export function StripCanvas({ template, photos, maxWidth = 900, className, label, numbers = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const fontsTick = useFontsTick()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const overlaySrc = maxWidth <= 450 && template.thumbSrc ? template.thumbSrc : template.overlaySrc
      const [imgs, overlay] = await Promise.all([
        Promise.all(photos.map((p) => (p ? loadImage(p).catch(() => null) : null))),
        overlaySrc ? loadImage(overlaySrc).catch(() => null) : null,
      ])
      if (cancelled || !ref.current) return
      composeTemplate(ref.current, template, imgs, { scale: Math.min(1, maxWidth / template.width), overlay, numbers })
    })()
    return () => {
      cancelled = true
    }
  }, [template, photos, maxWidth, numbers, fontsTick])

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={label ?? `Template ${template.name}`}
      style={{ aspectRatio: `${template.width} / ${template.height}` }}
    />
  )
}
