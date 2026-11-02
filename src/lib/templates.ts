import { loadImage } from './images'

export type Rect = { x: number; y: number; w: number; h: number }

export type Template = {
  id: string
  name: string
  /** jumlah slot foto: 3, 4, atau 6 */
  slots: number
  width: number
  height: number
  rects: Rect[]
  /** radius sudut foto (px pada ukuran template) */
  radius: number
  drawBack?: (ctx: CanvasRenderingContext2D) => void
  drawFront?: (ctx: CanvasRenderingContext2D) => void
  /** gambar frame (area foto transparan) yang digambar di atas foto */
  overlaySrc?: string
  /** versi kecil untuk thumbnail */
  thumbSrc?: string
  /** lubang ke-i menampilkan foto ke-slotOf[i] (untuk lembar 2 strip kembar). Default: identitas */
  slotOf?: number[]
  /** 'kpop' = frame berisi sosok idol; ditampilkan terpisah dan foto user ada di belakangnya */
  group?: 'kpop'
  source: 'builtin' | 'file' | 'upload'
}

export const SLOT_OPTIONS = [2, 3, 4, 6] as const

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export { roundRectPath }

function sizeOf(src: CanvasImageSource): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight }
  if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight }
  const s = src as HTMLCanvasElement
  return { w: s.width, h: s.height }
}

/* ------------------------------------------------------------------ */
/* Template bawaan (digambar lewat canvas, gaya sama dengan desain)    */
/* ------------------------------------------------------------------ */

type Style = {
  id: string
  name: string
  bg: string
  fg: string
  accent: string
  line: string
  shadow: string
  pattern: 'dots' | 'stripes' | 'checks' | 'stars' | 'none'
}

const styles: Style[] = [
  { id: 'pink', name: 'Pink Pop', bg: '#ff4f96', fg: '#fff9e9', accent: '#ffd938', line: '#19171c', shadow: '#19171c', pattern: 'dots' },
  { id: 'sunny', name: 'Sunny Day', bg: '#ffd938', fg: '#19171c', accent: '#ff4f96', line: '#19171c', shadow: '#19171c', pattern: 'stripes' },
  { id: 'grape', name: 'Grape Soda', bg: '#9c72f7', fg: '#fff9e9', accent: '#c9f36c', line: '#19171c', shadow: '#19171c', pattern: 'checks' },
  { id: 'midnight', name: 'Midnight', bg: '#19171c', fg: '#fff9e9', accent: '#ffd938', line: '#fff9e9', shadow: '#ff4f96', pattern: 'stars' },
  { id: 'cream', name: 'Cream Soda', bg: '#fff9e9', fg: '#19171c', accent: '#ff4f96', line: '#19171c', shadow: '#ff4f96', pattern: 'none' },
]

function layoutFor(n: number): { W: number; H: number; rects: Rect[]; ts: number } {
  if (n === 2) {
    return {
      W: 720,
      H: 1180,
      ts: 42,
      rects: [0, 1].map((i) => ({ x: 50, y: 150 + i * 440, w: 620, h: 400 })),
    }
  }
  if (n === 4) {
    return {
      W: 1000,
      H: 1360,
      ts: 50,
      rects: [
        { x: 50, y: 150, w: 435, h: 520 },
        { x: 515, y: 150, w: 435, h: 520 },
        { x: 50, y: 700, w: 435, h: 520 },
        { x: 515, y: 700, w: 435, h: 520 },
      ],
    }
  }
  if (n === 6) {
    const rects: Rect[] = []
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 2; c += 1) rects.push({ x: 50 + c * 465, y: 150 + r * 360, w: 435, h: 330 })
    }
    return { W: 1000, H: 1340, ts: 50, rects }
  }
  return {
    W: 720,
    H: 1600,
    ts: 42,
    rects: [0, 1, 2].map((i) => ({ x: 50, y: 150 + i * 440, w: 620, h: 400 })),
  }
}

function drawPattern(ctx: CanvasRenderingContext2D, st: Style, W: number, H: number) {
  ctx.save()
  if (st.pattern === 'dots') {
    ctx.globalAlpha = 0.16
    ctx.fillStyle = st.fg
    for (let y = 20; y < H; y += 44) {
      for (let x = (y / 44) % 2 ? 40 : 18; x < W; x += 44) {
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (st.pattern === 'stripes') {
    ctx.globalAlpha = 0.1
    ctx.strokeStyle = st.fg
    ctx.lineWidth = 16
    for (let i = -H; i < W + H; i += 56) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + H, H)
      ctx.stroke()
    }
  } else if (st.pattern === 'checks') {
    ctx.globalAlpha = 0.12
    ctx.fillStyle = st.fg
    const s = 60
    for (let y = 0; y < H; y += s) {
      for (let x = 0; x < W; x += s) {
        if (((x + y) / s) % 2 === 0) ctx.fillRect(x, y, s, s)
      }
    }
  } else if (st.pattern === 'stars') {
    ctx.fillStyle = st.accent
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let seed = 7
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < 70; i += 1) {
      ctx.globalAlpha = 0.12 + rnd() * 0.3
      ctx.font = `${14 + rnd() * 26}px Arial, sans-serif`
      ctx.fillText('✦', rnd() * W, rnd() * H)
    }
  }
  ctx.restore()
}

function makeBuiltin(n: number, st: Style): Template {
  const { W, H, rects, ts } = layoutFor(n)
  const radius = 20
  return {
    id: `builtin-${n}-${st.id}`,
    name: st.name,
    slots: n,
    width: W,
    height: H,
    rects,
    radius,
    source: 'builtin',
    drawBack(ctx) {
      ctx.fillStyle = st.bg
      ctx.fillRect(0, 0, W, H)
      drawPattern(ctx, st, W, H)
      ctx.fillStyle = st.shadow
      rects.forEach((r) => {
        roundRectPath(ctx, r.x + 8, r.y + 9, r.w, r.h, radius)
        ctx.fill()
      })
    },
    drawFront(ctx) {
      ctx.strokeStyle = st.line
      ctx.lineWidth = 4
      rects.forEach((r) => {
        roundRectPath(ctx, r.x, r.y, r.w, r.h, radius)
        ctx.stroke()
      })
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = st.fg
      ctx.font = `${ts}px "Archivo Black", Arial, sans-serif`
      const wA = ctx.measureText('KLIK').width
      const wB = ctx.measureText('KO').width
      const x0 = W / 2 - (wA + wB) / 2
      ctx.textAlign = 'left'
      ctx.fillText('KLIK', x0, 76)
      ctx.fillStyle = st.accent
      ctx.fillText('KO', x0 + wA, 76)
      ctx.textAlign = 'center'
      ctx.fillStyle = st.fg
      ctx.font = `600 ${Math.round(ts * 0.57)}px "DM Sans", Arial, sans-serif`
      ctx.fillText('tiny moments, big memories', W / 2, 116)
      const bottom = rects[rects.length - 1].y + rects[rects.length - 1].h
      const footerMid = bottom + (H - bottom) / 2
      ctx.font = `${Math.round(ts * 0.62)}px "Permanent Marker", cursive`
      ctx.fillText('besties forever ♡', W / 2, footerMid - 4)
      ctx.font = `700 ${Math.round(ts * 0.55)}px "DM Sans", Arial, sans-serif`
      ctx.fillText(
        new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        W / 2,
        footerMid + ts * 0.8,
      )
    },
  }
}

export function builtinTemplates(): Template[] {
  return SLOT_OPTIONS.flatMap((n) => styles.map((st) => makeBuiltin(n, st)))
}

/* ------------------------------------------------------------------ */
/* Template dari file PNG: area foto = bagian TRANSPARAN               */
/* ------------------------------------------------------------------ */

/** Cari kotak-kotak transparan pada PNG template secara otomatis. */
export function detectSlots(img: HTMLImageElement): Rect[] {
  const maxDim = 600
  const k = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const cw = Math.max(1, Math.round(img.naturalWidth * k))
  const ch = Math.max(1, Math.round(img.naturalHeight * k))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, cw, ch)
  const data = ctx.getImageData(0, 0, cw, ch).data
  const total = cw * ch
  const hole = new Uint8Array(total)
  for (let i = 0; i < total; i += 1) hole[i] = data[i * 4 + 3] < 40 ? 1 : 0

  const seen = new Uint8Array(total)
  const comps: { minX: number; minY: number; maxX: number; maxY: number; count: number }[] = []
  const stack: number[] = []
  for (let start = 0; start < total; start += 1) {
    if (!hole[start] || seen[start]) continue
    let minX = cw, minY = ch, maxX = 0, maxY = 0, count = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const p = stack.pop()!
      const x = p % cw
      const y = (p / cw) | 0
      count += 1
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0 && hole[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1) }
      if (x < cw - 1 && hole[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1) }
      if (y > 0 && hole[p - cw] && !seen[p - cw]) { seen[p - cw] = 1; stack.push(p - cw) }
      if (y < ch - 1 && hole[p + cw] && !seen[p + cw]) { seen[p + cw] = 1; stack.push(p + cw) }
    }
    comps.push({ minX, minY, maxX, maxY, count })
  }

  const boxes = comps
    .filter((c) => c.count >= total * 0.012)
    .filter((c) => (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1) < total * 0.85)
    .map((c) => ({
      x: Math.max(0, Math.floor(c.minX / k) - 2),
      y: Math.max(0, Math.floor(c.minY / k) - 2),
      w: Math.ceil((c.maxX - c.minX + 1) / k) + 4,
      h: Math.ceil((c.maxY - c.minY + 1) / k) + 4,
    }))

  // urutkan: baris dari atas ke bawah, lalu kiri ke kanan
  boxes.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2))
  const rows: Rect[][] = []
  for (const b of boxes) {
    const row = rows.find((r) => Math.abs(r[0].y + r[0].h / 2 - (b.y + b.h / 2)) < r[0].h * 0.5)
    if (row) row.push(b)
    else rows.push([b])
  }
  return rows.flatMap((r) => r.sort((a, b) => a.x - b.x))
}

export async function templateFromImage(
  src: string,
  meta: { id: string; name: string; source: 'file' | 'upload' },
): Promise<Template> {
  const img = await loadImage(src)
  const rects = detectSlots(img)
  return {
    id: meta.id,
    name: meta.name,
    slots: rects.length,
    width: img.naturalWidth,
    height: img.naturalHeight,
    rects,
    radius: 0,
    overlaySrc: src,
    source: meta.source,
  }
}

type ManifestEntry = {
  id?: string
  name?: string
  slots?: number
  src: string
  thumb?: string
  width?: number
  height?: number
  photoSlots?: Rect[]
  slotOf?: number[]
}

const BASE = import.meta.env.BASE_URL
const resolveUrl = (u: string, dir = 'templates/') => (/^(https?:|data:|\/)/.test(u) ? u : `${BASE}${dir}${u}`)

async function loadManifest(
  dir: string,
  group?: 'kpop',
): Promise<{ templates: Template[]; replaceBuiltin: boolean }> {
  try {
    const res = await fetch(`${BASE}${dir}manifest.json`, { cache: 'no-cache' })
    if (!res.ok) return { templates: [], replaceBuiltin: false }
    const json = (await res.json()) as { replaceBuiltin?: boolean; templates?: ManifestEntry[] }
    const loaded = await Promise.all(
      (json.templates ?? []).map(async (e, i): Promise<Template | null> => {
        try {
          const url = resolveUrl(e.src, dir)
          let t: Template
          if (e.photoSlots?.length && e.width && e.height) {
            // metadata lengkap: tidak perlu mengunduh gambar besar sekarang
            t = {
              id: e.id ?? `${group ?? 'file'}-${i}`,
              name: e.name ?? e.src,
              slots: e.slots ?? (e.slotOf ? Math.max(...e.slotOf) + 1 : e.photoSlots.length),
              width: e.width,
              height: e.height,
              rects: e.photoSlots,
              radius: 0,
              overlaySrc: url,
              source: 'file',
            }
          } else {
            // tanpa metadata: deteksi lubang transparan otomatis
            t = await templateFromImage(url, { id: e.id ?? `file-${i}`, name: e.name ?? e.src.replace(/\.[a-z0-9]+$/i, ''), source: 'file' })
            if (e.slots) t.slots = e.slots
          }
          if (e.thumb) t.thumbSrc = resolveUrl(e.thumb, dir)
          if (e.slotOf) t.slotOf = e.slotOf
          if (group) t.group = group
          const holes = t.rects.length
          const expected = t.slotOf ? t.slotOf.length : t.slots
          if (!(SLOT_OPTIONS as readonly number[]).includes(t.slots) || holes !== expected) {
            console.warn(`[template] "${e.src}": ${holes} lubang, slot ${t.slots}. Dilewati.`)
            return null
          }
          return t
        } catch (err) {
          console.warn('[template] gagal memuat', e.src, err)
          return null
        }
      }),
    )
    return { templates: loaded.filter((t): t is Template => !!t), replaceBuiltin: !!json.replaceBuiltin }
  } catch {
    return { templates: [], replaceBuiltin: false }
  }
}

/** Muat template biasa (public/templates) dan frame K-Pop (public/templates/kpop). */
export async function loadManifestTemplates(): Promise<{
  templates: Template[]
  kpop: Template[]
  replaceBuiltin: boolean
}> {
  const [main, kpop] = await Promise.all([loadManifest('templates/'), loadManifest('templates/kpop/', 'kpop')])
  return { templates: main.templates, kpop: kpop.templates, replaceBuiltin: main.replaceBuiltin }
}

/* ------------------------------------------------------------------ */
/* Compose: gambar template + foto ke canvas                           */
/* ------------------------------------------------------------------ */

export function composeTemplate(
  canvas: HTMLCanvasElement,
  t: Template,
  photos: (CanvasImageSource | null)[],
  opts: { scale?: number; overlay?: HTMLImageElement | null; numbers?: boolean } = {},
) {
  const overlay = opts.overlay ?? null
  const scale = opts.scale ?? 1
  canvas.width = Math.round(t.width * scale)
  canvas.height = Math.round(t.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, t.width, t.height)
  if (!t.overlaySrc) {
    ctx.fillStyle = '#fff9e9'
    ctx.fillRect(0, 0, t.width, t.height)
  }
  t.drawBack?.(ctx)

  t.rects.forEach((r, i) => {
    ctx.save()
    roundRectPath(ctx, r.x, r.y, r.w, r.h, t.radius)
    ctx.clip()
    const photo = photos[t.slotOf ? t.slotOf[i] : i]
    if (photo) {
      const { w, h } = sizeOf(photo)
      if (w && h) {
        const k = Math.max(r.w / w, r.h / h)
        const dw = w * k
        const dh = h * k
        ctx.drawImage(photo, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh)
      }
    } else {
      ctx.fillStyle = '#d7c5ff'
      ctx.fillRect(r.x, r.y, r.w, r.h)
      if (opts.numbers === false) {
        ctx.restore()
        return
      }
      ctx.fillStyle = 'rgba(255,255,255,.65)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.min(r.w, r.h) * 0.4}px "Archivo Black", Arial, sans-serif`
      ctx.fillText(String((t.slotOf ? t.slotOf[i] : i) + 1), r.x + r.w / 2, r.y + r.h / 2)
    }
    ctx.restore()
  })

  t.drawFront?.(ctx)
  if (overlay) ctx.drawImage(overlay, 0, 0, t.width, t.height)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}
