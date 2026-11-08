import { applyPalette, GIFEncoder, quantize } from './gifenc.js'
import { drawStickers, fontLoadsFor, type Sticker } from './stickers'
import { composeTemplate, type Template } from './templates'
import { ensureFonts, loadImage } from './images'

/** Satu klip = urutan frame kecil yang direkam di sekitar jepretan. `still` = indeks frame foto akhir. */
export type Clip = { frames: HTMLCanvasElement[]; still: number }

const FRAME_DELAY = 100
const HOLD_END = 1400

/**
 * Susun GIF "live photo": tiap slot memutar klipnya sendiri (foto yang diunggah tetap diam),
 * lalu frame terakhir menampilkan foto final sebelum mengulang.
 */
export async function buildGif(
  template: Template,
  shots: (string | null)[],
  clips: (Clip | null)[],
  stickers: Sticker[],
  onProgress: (p: number) => void,
  width = 440,
): Promise<Blob> {
  await ensureFonts(fontLoadsFor(stickers))
  const [stills, overlay] = await Promise.all([
    Promise.all(shots.map((s) => (s ? loadImage(s) : null))),
    template.overlaySrc ? loadImage(template.overlaySrc) : null,
  ])
  const total = Math.max(1, ...clips.map((c) => c?.frames.length ?? 0))
  const scale = width / template.width
  const canvas = document.createElement('canvas')
  const gif = GIFEncoder()

  // frame animasi + 1 frame akhir berisi foto final
  for (let k = 0; k <= total; k += 1) {
    const photos: (CanvasImageSource | null)[] = stills.map((img, i) => {
      const clip = clips[i]
      if (k === total || !clip) return img
      return clip.frames[Math.min(k, clip.frames.length - 1)]
    })
    composeTemplate(canvas, template, photos, { scale, overlay, numbers: false })
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    await drawStickers(ctx, stickers, canvas.width, canvas.height)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const palette = quantize(data, 256)
    gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, {
      palette,
      delay: k === total ? HOLD_END : FRAME_DELAY,
    })
    onProgress((k + 1) / (total + 1))
    await new Promise((r) => setTimeout(r, 0)) // beri napas ke UI
  }
  gif.finish()
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
}
