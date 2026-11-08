import { loadImage } from './images'
import { roundRectPath } from './templates'

export type Sticker = {
  id: string
  kind: 'emoji' | 'text' | 'image'
  /** emoji, teks, atau data-URL gambar */
  value: string
  bg?: string
  fg?: string
  /** id font (hanya stiker teks) */
  font?: string
  /** teks dalam kotak (default) atau teks polos dengan garis tepi */
  boxed?: boolean
  /** lebar / tinggi (untuk gambar) */
  aspect?: number
  /** posisi tengah, pecahan 0..1 dari lebar/tinggi strip */
  x: number
  y: number
  scale: number
  rot: number
}

export const emojiGroups: { id: string; label: string; items: string[] }[] = [
  {
    id: 'cute',
    label: '✨ Lucu',
    items: [
      '💖', '✨', '⭐', '🌸', '🎀', '🦋', '🍒', '🌈', '💫', '🧸', '🍓', '🫶', '☁️', '🌷', '💌', '🍭',
      '🐰', '🐱', '🐻', '🐼', '🐥', '🦄', '🍑', '🍰', '🧁', '🍩', '🍬', '🍡', '🌼', '🌺', '🌻', '🪩',
      '💕', '💗', '💝', '💞', '🩷', '🫧', '🪄', '🎈', '🎁', '🍀', '🌙', '☀️', '🐾', '🦢', '🍉', '🍋', '🌟', '🎵',
    ],
  },
  {
    id: 'mood',
    label: '😎 Mood',
    items: [
      '😎', '🥹', '😍', '🤪', '🥳', '😜', '😇', '🤩', '🔥', '💅', '👑', '🕶️', '🫠', '😈', '🤡', '💀',
      '😂', '🤣', '😭', '🥺', '😘', '😏', '🙄', '😴', '🤭', '🫣', '😤', '🤯', '🥶', '🥵', '😱', '🤗',
      '🤫', '🫡', '😌', '🙃', '😆', '😝', '🤠', '👻', '👽', '🤖', '💯', '💢', '✌️', '🤞', '👏', '🙌', '🫰', '😵‍💫',
    ],
  },
]

/** Font untuk stiker teks. `family` = nama di Google Fonts (sudah di-import di index.css). */
export const textFonts: { id: string; label: string; family: string; weight?: number }[] = [
  { id: 'marker', label: 'Marker', family: 'Permanent Marker' },
  { id: 'black', label: 'Tebal', family: 'Archivo Black' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico' },
  { id: 'lobster', label: 'Lobster', family: 'Lobster' },
  { id: 'bangers', label: 'Komik', family: 'Bangers' },
  { id: 'caveat', label: 'Tulisan Tangan', family: 'Caveat', weight: 700 },
  { id: 'dancing', label: 'Dancing', family: 'Dancing Script', weight: 700 },
  { id: 'fredoka', label: 'Bulat', family: 'Fredoka', weight: 600 },
]

export const textThemes: { bg: string; fg: string }[] = [
  { bg: '#ffd938', fg: '#19171c' },
  { bg: '#ff4f96', fg: '#fffef9' },
  { bg: '#9c72f7', fg: '#fffef9' },
  { bg: '#c9f36c', fg: '#19171c' },
  { bg: '#62b6ff', fg: '#19171c' },
  { bg: '#fffef9', fg: '#19171c' },
  { bg: '#19171c', fg: '#ffd938' },
  { bg: '#fff9e9', fg: '#ff4f96' },
]

export const fontOf = (id?: string) => textFonts.find((f) => f.id === id) ?? textFonts[0]
export const fontCss = (id: string | undefined, px: number | string) => {
  const f = fontOf(id)
  return `${f.weight ?? 400} ${typeof px === 'number' ? `${px}px` : px} "${f.family}", cursive`
}
/** daftar font (untuk document.fonts.load) yang dipakai stiker teks */
export const fontLoadsFor = (stickers: Sticker[]) =>
  [...new Set(stickers.filter((s) => s.kind === 'text').map((s) => s.font ?? textFonts[0].id))].map((id) => fontCss(id, 40))

export const fontFamilyCss = (id?: string) => `"${fontOf(id).family}", cursive`

export const textPresets: { text: string; bg: string; fg: string }[] = [
  { text: 'CHEESE!', bg: '#ffd938', fg: '#19171c' },
  { text: 'besties', bg: '#ff4f96', fg: '#fffef9' },
  { text: 'SLAY', bg: '#9c72f7', fg: '#fffef9' },
  { text: 'xoxo', bg: '#c9f36c', fg: '#19171c' },
  { text: 'good vibes', bg: '#fffef9', fg: '#19171c' },
  { text: 'main character', bg: '#19171c', fg: '#ffd938' },
  { text: 'so cute', bg: '#62b6ff', fg: '#19171c' },
  { text: '3…2…1', bg: '#fff9e9', fg: '#ff4f96' },
  { text: 'squad', bg: '#ff4f96', fg: '#ffd938' },
  { text: 'iykyk', bg: '#19171c', fg: '#c9f36c' },
]

/** Ukuran dasar sebagai pecahan dari lebar strip (dipakai sama persis di preview DOM & export canvas). */
export const EMOJI_SIZE = 0.13
export const TEXT_SIZE = 0.056
export const IMAGE_SIZE = 0.22

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
/** Padding & border stiker teks dalam satuan em */
export const TEXT_PAD_X = 0.5
export const TEXT_PAD_Y = 0.18
export const TEXT_BORDER = 0.08
/** tebal garis tepi (sisi luar) untuk teks polos, dalam em */
export const PLAIN_STROKE = 0.08

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}

export async function drawStickers(ctx: CanvasRenderingContext2D, stickers: Sticker[], W: number, H: number) {
  for (const s of stickers) {
    ctx.save()
    ctx.translate(s.x * W, s.y * H)
    ctx.rotate((s.rot * Math.PI) / 180)
    if (s.kind === 'emoji') {
      const fs = EMOJI_SIZE * W * s.scale
      ctx.font = `${fs}px ${EMOJI_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.value, 0, fs * 0.04)
    } else if (s.kind === 'text') {
      const fs = TEXT_SIZE * W * s.scale
      ctx.font = fontCss(s.font, fs)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const m = ctx.measureText(s.value)
      // sama dengan DOM (line-height: 1): baseline = (ascent - descent) / 2 dari titik tengah
      const asc = m.fontBoundingBoxAscent ?? fs * 0.8
      const desc = m.fontBoundingBoxDescent ?? fs * 0.2
      const baseY = (asc - desc) / 2
      const tw = m.width
      if (s.boxed === false) {
        ctx.lineJoin = 'round'
        ctx.lineWidth = PLAIN_STROKE * 2 * fs
        ctx.strokeStyle = '#19171c'
        ctx.strokeText(s.value, 0, baseY)
        ctx.fillStyle = s.fg ?? '#fffef9'
        ctx.fillText(s.value, 0, baseY)
      } else {
        const bw = TEXT_BORDER * fs
        const w = tw + 2 * TEXT_PAD_X * fs + 2 * bw
        const h = fs + 2 * TEXT_PAD_Y * fs + 2 * bw
        const radius = 0.35 * fs
        ctx.fillStyle = '#19171c'
        roundRectPath(ctx, -w / 2 + bw, -h / 2 + bw, w, h, radius)
        ctx.fill()
        roundRectPath(ctx, -w / 2, -h / 2, w, h, radius)
        ctx.fillStyle = '#19171c'
        ctx.fill()
        roundRectPath(ctx, -w / 2 + bw, -h / 2 + bw, w - 2 * bw, h - 2 * bw, Math.max(0, radius - bw))
        ctx.fillStyle = s.bg ?? '#ffd938'
        ctx.fill()
        ctx.fillStyle = s.fg ?? '#19171c'
        ctx.fillText(s.value, 0, baseY)
      }
    } else {
      try {
        const img = await loadImage(s.value)
        const w = IMAGE_SIZE * W * s.scale
        const h = w / (s.aspect ?? img.naturalWidth / img.naturalHeight)
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
      } catch {
        /* abaikan gambar yang gagal dimuat */
      }
    }
    ctx.restore()
  }
}
