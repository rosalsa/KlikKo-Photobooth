const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => {
        cache.delete(src)
        reject(new Error(`Gagal memuat gambar: ${src.slice(0, 60)}`))
      }
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Perkecil gambar (mis. stiker upload) supaya ringan. */
export async function downscaleDataURL(dataUrl: string, maxSide: number): Promise<{ url: string; aspect: number }> {
  const img = await loadImage(dataUrl)
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * k))
  const h = Math.max(1, Math.round(img.naturalHeight * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  return { url: canvas.toDataURL('image/png'), aspect: w / h }
}

export async function ensureFonts(extra: string[] = []) {
  try {
    await Promise.all([
      document.fonts.load('40px "Archivo Black"'),
      document.fonts.load('700 24px "DM Sans"'),
      ...extra.map((css) => document.fonts.load(css)),
    ])
  } catch {
    /* font gagal dimuat: canvas memakai fallback */
  }
}
