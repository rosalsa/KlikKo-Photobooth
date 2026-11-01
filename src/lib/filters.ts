// Filter kamera. Setiap filter didefinisikan sebagai parameter (fx) supaya bisa dipakai
// lewat CSS filter (preview + ctx.filter) dan lewat fallback pixel untuk browser yang
// belum mendukung ctx.filter (mis. Safari).

export type Fx = { bri?: number; con?: number; sat?: number; gray?: number; sepia?: number; hue?: number }

export type Filter = { name: string; swatch: string; fx: Fx; css: string }

export function cssOf(fx: Fx): string {
  const p: string[] = []
  if (fx.bri !== undefined) p.push(`brightness(${fx.bri})`)
  if (fx.con !== undefined) p.push(`contrast(${fx.con})`)
  if (fx.sat !== undefined) p.push(`saturate(${fx.sat})`)
  if (fx.gray !== undefined) p.push(`grayscale(${fx.gray})`)
  if (fx.sepia !== undefined) p.push(`sepia(${fx.sepia})`)
  if (fx.hue !== undefined) p.push(`hue-rotate(${fx.hue}deg)`)
  return p.length ? p.join(' ') : 'none'
}

const make = (name: string, swatch: string, fx: Fx): Filter => ({ name, swatch, fx, css: cssOf(fx) })

export const filters: Filter[] = [
  make('Natural', 'linear-gradient(135deg, #ffbd8b, #8fc7ff)', {}),
  make('Cherry', '#ff6f91', { con: 1.05, sat: 1.25, sepia: 0.12, hue: 330 }),
  make('Dreamy', '#c9b8ff', { bri: 1.12, con: 0.88, sat: 0.8 }),
  make('B&W', '#343434', { con: 1.12, gray: 1 }),
  make('Retro', '#e0a458', { bri: 1.03, con: 1.05, sat: 1.3, sepia: 0.45 }),
  make('Pop', 'linear-gradient(135deg, #ffd938, #ff4f96)', { con: 1.15, sat: 1.6 }),
]

let ctxFilterSupport: boolean | null = null
function supportsCtxFilter(): boolean {
  if (ctxFilterSupport === null) {
    const ctx = document.createElement('canvas').getContext('2d')
    ctxFilterSupport = !!ctx && 'filter' in ctx
  }
  return ctxFilterSupport
}

type M3 = [number, number, number, number, number, number, number, number, number]

function applyFxPixels(ctx: CanvasRenderingContext2D, w: number, h: number, fx: Fx) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const mats: M3[] = []
  if (fx.sat !== undefined) {
    const s = fx.sat
    mats.push([0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s])
  }
  if (fx.gray !== undefined) {
    const a = 1 - fx.gray
    mats.push([0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a, 0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a, 0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a])
  }
  if (fx.sepia !== undefined) {
    const a = 1 - fx.sepia
    mats.push([0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a, 0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a, 0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a])
  }
  if (fx.hue !== undefined) {
    const r = (fx.hue * Math.PI) / 180
    const c = Math.cos(r)
    const s = Math.sin(r)
    mats.push([
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ])
  }
  const bri = fx.bri ?? 1
  const con = fx.con ?? 1
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * bri
    let g = d[i + 1] * bri
    let b = d[i + 2] * bri
    if (con !== 1) {
      r = (r - 128) * con + 128
      g = (g - 128) * con + 128
      b = (b - 128) * con + 128
    }
    for (const m of mats) {
      const nr = m[0] * r + m[1] * g + m[2] * b
      const ng = m[3] * r + m[4] * g + m[5] * b
      const nb = m[6] * r + m[7] * g + m[8] * b
      r = clamp(nr)
      g = clamp(ng)
      b = clamp(nb)
    }
    d[i] = clamp(r)
    d[i + 1] = clamp(g)
    d[i + 2] = clamp(b)
  }
  ctx.putImageData(img, 0, 0)
}

/** Ambil crop tengah 4:3 dari video/gambar, terapkan filter, kembalikan sebagai JPEG data-URL. */
export function frameToDataURL(
  src: HTMLVideoElement | HTMLImageElement,
  srcW: number,
  srcH: number,
  fx: Fx,
  mirror: boolean,
): string {
  const aspect = 4 / 3
  let cw = srcW
  let ch = srcW / aspect
  if (ch > srcH) {
    ch = srcH
    cw = srcH * aspect
  }
  const sx = (srcW - cw) / 2
  const sy = (srcH - ch) / 2
  const outW = Math.min(1280, Math.round(cw))
  const outH = Math.round(outW / aspect)
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  const native = supportsCtxFilter()
  const hasFx = Object.keys(fx).length > 0
  if (native && hasFx) ctx.filter = cssOf(fx)
  if (mirror) {
    ctx.translate(outW, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(src, sx, sy, cw, ch, 0, 0, outW, outH)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.filter = 'none'
  if (!native && hasFx) applyFxPixels(ctx, outW, outH, fx)
  return canvas.toDataURL('image/jpeg', 0.92)
}
