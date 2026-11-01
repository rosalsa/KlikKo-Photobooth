import { useRef, useState } from 'react'
import { downscaleDataURL, ensureFonts, readFileAsDataURL } from '../lib/images'
import { composeTemplate, type Template } from '../lib/templates'
import { loadImage } from '../lib/images'
import {
  EMOJI_FONT, EMOJI_SIZE, IMAGE_SIZE, TEXT_BORDER, TEXT_FONT, TEXT_PAD_X, TEXT_PAD_Y, TEXT_SIZE,
  drawStickers, emojiGroups, newId, textPresets, type Sticker,
} from '../lib/stickers'
import { Icon } from './Icon'
import { StripCanvas } from './StripCanvas'

type Props = {
  n: number
  shots: (string | null)[]
  templates: Template[]
  template: Template
  onTemplate: (id: string) => void
  stickers: Sticker[]
  setStickers: React.Dispatch<React.SetStateAction<Sticker[]>>
  onBack: () => void
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function StickerView({
  s, selected, stageRef, onSelect, onChange, onRemove,
}: {
  s: Sticker
  selected: boolean
  stageRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onChange: (patch: Partial<Sticker>) => void
  onRemove: () => void
}) {
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; w: number; h: number } | null>(null)

  const style: React.CSSProperties = {
    left: `${s.x * 100}%`,
    top: `${s.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
  }
  let content: React.ReactNode
  if (s.kind === 'emoji') {
    style.fontSize = `${EMOJI_SIZE * 100 * s.scale}cqw`
    style.fontFamily = EMOJI_FONT
    content = s.value
  } else if (s.kind === 'text') {
    style.fontSize = `${TEXT_SIZE * 100 * s.scale}cqw`
    style.fontFamily = TEXT_FONT
    style.background = s.bg
    style.color = s.fg
    style.border = `${TEXT_BORDER}em solid #19171c`
    style.borderRadius = '0.35em'
    style.padding = `${TEXT_PAD_Y}em ${TEXT_PAD_X}em`
    style.boxShadow = `${TEXT_BORDER}em ${TEXT_BORDER}em 0 #19171c`
    style.whiteSpace = 'nowrap'
    content = s.value
  } else {
    style.width = `${IMAGE_SIZE * 100 * s.scale}cqw`
    style.aspectRatio = String(s.aspect ?? 1)
    content = <img src={s.value} alt="" draggable={false} />
  }

  return (
    <div
      className={`sticker ${s.kind} ${selected ? 'selected' : ''}`}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`Stiker ${s.kind === 'image' ? 'gambar' : s.value}. Seret untuk memindahkan, Delete untuk menghapus`}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect()
        const rect = stageRef.current?.getBoundingClientRect()
        if (!rect) return
        drag.current = { sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y, w: rect.width, h: rect.height }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        onChange({
          x: clamp(d.ox + (e.clientX - d.sx) / d.w, 0, 1),
          y: clamp(d.oy + (e.clientY - d.sy) / d.h, 0, 1),
        })
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onFocus={onSelect}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.04 : 0.01
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onRemove() }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); onChange({ x: clamp(s.x - step, 0, 1) }) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); onChange({ x: clamp(s.x + step, 0, 1) }) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); onChange({ y: clamp(s.y - step, 0, 1) }) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); onChange({ y: clamp(s.y + step, 0, 1) }) }
        else if (e.key === '+' || e.key === '=') onChange({ scale: clamp(s.scale * 1.1, 0.3, 4) })
        else if (e.key === '-') onChange({ scale: clamp(s.scale / 1.1, 0.3, 4) })
      }}
    >
      {content}
    </div>
  )
}

export function EditStep({
  n, shots, templates, template, onTemplate, stickers, setStickers, onBack,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const stickerFileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<string>('cute')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selected = stickers.find((s) => s.id === selectedId) ?? null

  const patch = (id: string, p: Partial<Sticker>) => setStickers((cur) => cur.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const remove = (id: string) => {
    setStickers((cur) => cur.filter((s) => s.id !== id))
    setSelectedId(null)
  }
  const add = (s: Omit<Sticker, 'id' | 'x' | 'y' | 'scale' | 'rot'>) => {
    const sticker: Sticker = {
      ...s,
      id: newId(),
      x: 0.5 + (Math.random() - 0.5) * 0.3,
      y: 0.45 + (Math.random() - 0.5) * 0.4,
      scale: 1,
      rot: Math.round((Math.random() - 0.5) * 20),
    }
    setStickers((cur) => [...cur, sticker])
    setSelectedId(sticker.id)
  }

  const uploadSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { url, aspect } = await downscaleDataURL(await readFileAsDataURL(file), 600)
      add({ kind: 'image', value: url, aspect })
    } catch {
      /* bukan gambar */
    }
  }

  const download = async () => {
    setSaving(true)
    try {
      await ensureFonts()
      const [imgs, overlay] = await Promise.all([
        Promise.all(shots.map((s) => (s ? loadImage(s) : null))),
        template.overlaySrc ? loadImage(template.overlaySrc) : null,
      ])
      const canvas = document.createElement('canvas')
      composeTemplate(canvas, template, imgs, { scale: 1, overlay })
      await drawStickers(canvas.getContext('2d')!, stickers, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `klikko-${n}foto.png`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [...emojiGroups.map((g) => ({ id: g.id, label: g.label })), { id: 'text', label: '💬 Teks' }]

  return (
    <div className="studio edit-studio">
      <div className="camera-card stage-card">
        <div className="camera-topbar">
          <div className="window-dots"><i /><i /><i /></div>
          <span>KLIKKO EDIT</span>
          <div className="record"><i /> PREVIEW</div>
        </div>
        <div className="stage-wrap" onPointerDown={() => setSelectedId(null)}>
          <div
            className="stage"
            ref={stageRef}
            style={{ ['--ar' as string]: template.width / template.height } as React.CSSProperties}
          >
            <StripCanvas template={template} photos={shots} maxWidth={1000} label="Hasil photo strip" />
            {stickers.map((s) => (
              <StickerView
                key={s.id}
                s={s}
                selected={s.id === selectedId}
                stageRef={stageRef}
                onSelect={() => setSelectedId(s.id)}
                onChange={(p) => patch(s.id, p)}
                onRemove={() => remove(s.id)}
              />
            ))}
          </div>
        </div>
        <p className="shot-counter">Seret stiker untuk memindahkan • klik stiker untuk mengatur</p>
      </div>

      <div className="edit-side">
        <div className="tool-panel">
          <div className="panel-title"><span>PILIH TEMPLATE • {n} FOTO</span><b>✦</b></div>
          <div className="tpl-grid">
            {templates.map((t) => (
              <button
                key={t.id}
                className={`tpl ${t.id === template.id ? 'active' : ''}`}
                onClick={() => onTemplate(t.id)}
                aria-pressed={t.id === template.id}
                aria-label={`Template ${t.name}`}
              >
                <StripCanvas template={t} photos={shots} maxWidth={220} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="tool-panel">
          <div className="panel-title"><span>TAMBAH STIKER</span><b>✦</b></div>
          <div className="tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'text' ? (
            <div className="text-grid">
              {textPresets.map((p) => (
                <button
                  key={p.text}
                  style={{ background: p.bg, color: p.fg }}
                  onClick={() => add({ kind: 'text', value: p.text, bg: p.bg, fg: p.fg })}
                >
                  {p.text}
                </button>
              ))}
            </div>
          ) : (
            <div className="emoji-grid">
              {emojiGroups.find((g) => g.id === tab)?.items.map((em) => (
                <button key={em} onClick={() => add({ kind: 'emoji', value: em })} aria-label={`Stiker ${em}`}>
                  {em}
                </button>
              ))}
            </div>
          )}
          <div className="tool-foot">
            <button className="mini-btn" onClick={() => stickerFileRef.current?.click()}>
              <Icon name="image" size={15} /> Upload stiker sendiri
            </button>
            <input ref={stickerFileRef} type="file" accept="image/*" hidden onChange={uploadSticker} />
          </div>
        </div>

        <div className="tool-panel">
          <div className="panel-title"><span>ATUR STIKER</span><b>{stickers.length}</b></div>
          {selected ? (
            <div className="sticker-tools">
              <button onClick={() => patch(selected.id, { scale: clamp(selected.scale / 1.15, 0.3, 4) })} aria-label="Perkecil"><Icon name="minus" size={18} /></button>
              <button onClick={() => patch(selected.id, { scale: clamp(selected.scale * 1.15, 0.3, 4) })} aria-label="Perbesar"><Icon name="plus" size={18} /></button>
              <button onClick={() => patch(selected.id, { rot: selected.rot - 15 })} aria-label="Putar kiri"><Icon name="rotL" size={18} /></button>
              <button onClick={() => patch(selected.id, { rot: selected.rot + 15 })} aria-label="Putar kanan"><Icon name="rotR" size={18} /></button>
              <button onClick={() => setStickers((cur) => [...cur.filter((s) => s.id !== selected.id), selected])} aria-label="Ke depan"><Icon name="front" size={18} /></button>
              <button className="danger" onClick={() => remove(selected.id)} aria-label="Hapus stiker"><Icon name="trash" size={18} /></button>
            </div>
          ) : (
            <p className="tool-hint">
              {stickers.length ? 'Klik sebuah stiker di foto untuk mengubah ukuran, putaran, atau menghapusnya.' : 'Belum ada stiker. Pilih salah satu di atas!'}
            </p>
          )}
        </div>

        <div className="edit-actions">
          <button onClick={onBack}><Icon name="back" size={17} /> Ke kamera</button>
          <button className="download" onClick={download} disabled={saving}>
            <Icon name="download" size={17} /> {saving ? 'Menyiapkan…' : 'Download PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
