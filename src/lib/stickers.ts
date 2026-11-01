import { loadImage } from './images'
import { roundRectPath } from './templates'

export type Sticker = {
  id: string
  kind: 'emoji' | 'text' | 'image'
  /** emoji, teks, atau data-URL gambar */
  value: string
  bg?: string
  fg?: string
  /** lebar / tinggi (untuk gambar) */
  aspect?: number
  /** posisi tengah, pecahan 0..1 dari lebar/tinggi strip */
  x: number
  y: number
  scale: number
  rot: number
}

export const emojiGroups: { id: string; label: string; items: string[] }[] = [
  { id: 'cute', label: '✨ Lucu', items: ['💖', '✨', '⭐', '🌸', '🎀', '🦋', '🍒', '🌈', '💫', '🧸', '🍓', '🫶', '☁️', '🌷', '💌', '🍭'] },
  { id: 'mood', label: '😎 Mood', items: ['😎', '🥹', '😍', '🤪', '🥳', '😜', '😇', '🤩', '🔥', '💅', '👑', '🕶️', '🫠', '😈', '🤡', '💀'] },
]

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
export const TEXT_FONT = '"Permanent Marker", cursive'
/** Padding & border stiker teks dalam satuan em */
export const TEXT_PAD_X = 0.5
export const TEXT_PAD_Y = 0.18
export const TEXT_BORDER = 0.08

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
      ctx.font = `${fs}px ${TEXT_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = ctx.measureText(s.value).width
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
      ctx.fillText(s.value, 0, fs * 0.04)
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
