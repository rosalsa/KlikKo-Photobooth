import { loadImage } from './images'
import type { Template } from './templates'

const cache = new Map<string, string>()

/**
 * Potongan frame K-Pop pada slot ke-i (berisi sosok idol, sisanya transparan).
 * Ditaruh di atas tampilan kamera supaya user bisa menyesuaikan pose.
 */
export async function poseGuide(t: Template, i: number): Promise<string | null> {
  if (!t.overlaySrc || !t.rects[i]) return null
  const key = `${t.id}:${i}`
  const hit = cache.get(key)
  if (hit) return hit
  const img = await loadImage(t.overlaySrc)
  const k = img.naturalWidth / t.width
  const r = t.rects[i]
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(r.w * k))
  canvas.height = Math.max(1, Math.round(r.h * k))
  canvas.getContext('2d')!.drawImage(img, r.x * k, r.y * k, r.w * k, r.h * k, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  return url
}
