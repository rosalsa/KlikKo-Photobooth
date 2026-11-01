import { useEffect, useRef, useState } from 'react'
import { filters, frameToDataURL } from '../lib/filters'
import { loadImage, readFileAsDataURL } from '../lib/images'
import type { Template } from '../lib/templates'
import { Icon } from './Icon'
import { StripCanvas } from './StripCanvas'

const TIMERS = [3, 5, 10]
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

type Props = {
  n: number
  shots: (string | null)[]
  setShots: React.Dispatch<React.SetStateAction<(string | null)[]>>
  filterIndex: number
  setFilterIndex: (i: number) => void
  previewTemplate: Template
  stream: MediaStream | null
  cameraError: string
  onStartCamera: () => void
  mirror: boolean
  setMirror: (v: boolean) => void
  timer: number
  setTimer: (v: number) => void
  auto: boolean
  setAuto: (v: boolean) => void
  onNext: () => void
  onReset: () => void
}

export function CameraStep({
  n, shots, setShots, filterIndex, setFilterIndex, previewTemplate, stream, cameraError, onStartCamera,
  mirror, setMirror, timer, setTimer, auto, setAuto, onNext, onReset,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const captureRef = useRef<HTMLInputElement>(null)
  const seqRef = useRef(0) // token urutan foto; berubah = urutan lama dibatalkan
  const filterRef = useRef(filterIndex)
  const mirrorRef = useRef(mirror)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState(0)
  const [flash, setFlash] = useState(false)
  const [retake, setRetake] = useState<number | null>(null)

  filterRef.current = filterIndex
  mirrorRef.current = mirror
  const cameraOn = !!stream
  const filled = shots.filter(Boolean).length
  const full = filled >= n
  const targetIndex = retake ?? shots.findIndex((s) => !s)

  // Pasang stream yang sudah ada (tanpa meminta izin lagi). Saat keluar dari langkah ini kamera dijeda, bukan dimatikan.
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      if (stream) video.play().catch(() => {}) // iOS Safari kadang tidak autoplay
    }
    stream?.getVideoTracks().forEach((t) => (t.enabled = true))
    return () => stream?.getVideoTracks().forEach((t) => (t.enabled = false))
  }, [stream])

  useEffect(
    () => () => {
      seqRef.current += 1
    },
    [],
  )

  const captureInto = (index: number) => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const url = frameToDataURL(video, video.videoWidth, video.videoHeight, filters[filterRef.current].fx, mirrorRef.current)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 180)
    setShots((cur) => cur.map((s, i) => (i === index ? url : s)))
    setRetake(null)
  }

  const stopSequence = () => {
    seqRef.current += 1
    setCountdown(null)
    setRunning(false)
  }

  const startSequence = async () => {
    const queue = retake !== null ? [retake] : auto ? shots.flatMap((s, i) => (s ? [] : [i])) : targetIndex >= 0 ? [targetIndex] : []
    if (!queue.length) return
    const id = (seqRef.current += 1)
    setRunning(true)
    for (let q = 0; q < queue.length; q += 1) {
      setCurrent(queue[q] + 1)
      for (let s = timer; s > 0; s -= 1) {
        setCountdown(s)
        await sleep(1000)
        if (seqRef.current !== id) return
      }
      setCountdown(null)
      captureInto(queue[q])
      if (q < queue.length - 1) {
        await sleep(900) // jeda singkat untuk ganti pose
        if (seqRef.current !== id) return
      }
    }
    setRunning(false)
  }

  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const urls: string[] = []
    for (const file of files) {
      try {
        const raw = await readFileAsDataURL(file)
        const img = await loadImage(raw)
        urls.push(frameToDataURL(img, img.naturalWidth, img.naturalHeight, filters[filterRef.current].fx, false))
      } catch {
        /* lewati file yang bukan gambar */
      }
    }
    setShots((cur) => {
      const next = [...cur]
      const queue = [...urls]
      if (retake !== null && queue.length) next[retake] = queue.shift()!
      for (let i = 0; i < next.length && queue.length; i += 1) if (!next[i]) next[i] = queue.shift()!
      return next
    })
    setRetake(null)
  }

  const filter = filters[filterIndex]
  const counter = running
    ? `Foto ke-${current} dari ${n} • klik tombol untuk berhenti`
    : retake !== null
      ? `Foto ulang slot ${retake + 1}`
      : `${filled}/${n} foto diambil${filled > 0 ? ' • klik foto buat ulang' : ''}`

  return (
    <div className="studio">
      <div className="camera-card">
        <div className="camera-topbar">
          <div className="window-dots"><i /><i /><i /></div>
          <span>KLIKKO CAM</span>
          <div className="record"><i /> LIVE</div>
        </div>
        <div className={`viewfinder ${cameraOn ? 'is-live' : ''} ${mirror ? 'mirror' : ''}`} style={{ filter: cameraOn ? filter.css : undefined }}>
          <video ref={videoRef} autoPlay playsInline muted />
          {!cameraOn && (
            <div className="camera-empty">
              <div className="camera-icon"><Icon name="camera" size={34} /></div>
              <h3>{cameraError ? 'OOPS, KAMERANYA MALU' : 'KAMERA SIAP BERAKSI'}</h3>
              <p>{cameraError || 'Izinkan akses kamera, lalu senyum paling lebar.'}</p>
              <button onClick={onStartCamera}>{cameraError ? 'Coba Lagi' : 'Aktifkan Kamera'}</button>
              {cameraError && (
                <button className="alt" onClick={() => captureRef.current?.click()}>
                  Foto pakai kamera HP
                </button>
              )}
            </div>
          )}
          <div className="focus-corner corner-one" />
          <div className="focus-corner corner-two" />
          {countdown !== null && <div className="countdown" key={`${current}-${countdown}`}>{countdown}</div>}
          {flash && <div className="flash" />}
          {running && <span className="shot-tag">FOTO {current}/{n}</span>}
          {cameraOn && <span className="filter-tag">{filter.name}</span>}
        </div>
        <div className="controls">
          <button className="small-control" onClick={() => fileRef.current?.click()} disabled={running} aria-label="Upload foto">
            <Icon name="upload" />
          </button>
          <button
            className={`shutter ${running ? 'is-running' : ''}`}
            onClick={running ? stopSequence : startSequence}
            disabled={!cameraOn || (!running && targetIndex < 0)}
            aria-label={running ? 'Berhenti' : retake !== null ? `Foto ulang slot ${retake + 1}` : auto ? 'Mulai foto otomatis' : 'Ambil foto'}
          >
            <span><Icon name={running ? 'stop' : 'camera'} size={28} /></span>
          </button>
          <button className="small-control" onClick={() => setFilterIndex((filterIndex + 1) % filters.length)} aria-label="Ganti filter">
            <Icon name="flash" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={uploadPhotos} />
          <input ref={captureRef} type="file" accept="image/*" capture="user" hidden onChange={uploadPhotos} />
        </div>

        <div className="cam-options">
          <button className={`opt ${mirror ? 'on' : ''}`} aria-pressed={mirror} onClick={() => setMirror(!mirror)} disabled={running}>
            <Icon name="flip" size={15} /> Mirror {mirror ? 'ON' : 'OFF'}
          </button>
          <div className="opt-group" role="group" aria-label="Timer">
            <span><Icon name="timer" size={15} /> Timer</span>
            {TIMERS.map((t) => (
              <button key={t} className={timer === t ? 'on' : ''} aria-pressed={timer === t} onClick={() => setTimer(t)} disabled={running}>
                {t}s
              </button>
            ))}
          </div>
          <button className={`opt ${auto ? 'on' : ''}`} aria-pressed={auto} onClick={() => setAuto(!auto)} disabled={running}>
            <Icon name="auto" size={15} /> Otomatis {auto ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="cam-hint">
          {auto ? `Klik sekali, semua slot difoto otomatis tiap ${timer} detik.` : `Klik tombol kamera untuk tiap foto (hitung mundur ${timer} detik).`}
        </p>

        <div className="slot-thumbs" role="group" aria-label="Slot foto">
          {shots.map((s, i) => (
            <button
              key={i}
              className={`slot-thumb ${retake === i ? 'selected' : ''} ${i === targetIndex ? 'next' : ''}`}
              onClick={() => (s ? setRetake(retake === i ? null : i) : setRetake(null))}
              disabled={running}
              aria-label={s ? `Foto ${i + 1}, klik untuk foto ulang` : `Slot ${i + 1} kosong`}
              aria-pressed={retake === i}
            >
              {s ? <img src={s} alt="" /> : <b>{i + 1}</b>}
            </button>
          ))}
        </div>
        <p className="shot-counter">{counter}</p>
      </div>

      <div className="side-panel">
        <div className="filter-panel">
          <div className="panel-title"><span>CHOOSE YOUR VIBE</span><b>✦</b></div>
          <div className="filter-list">
            {filters.map((f, index) => (
              <button key={f.name} className={filterIndex === index ? 'active' : ''} onClick={() => setFilterIndex(index)}>
                <i style={{ background: f.swatch }} /> {f.name}
                {filterIndex === index && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="strip-preview">
          <div className="strip-label">YOUR PHOTO STRIP</div>
          <div className="strip">
            <StripCanvas template={previewTemplate} photos={shots} maxWidth={420} label="Preview photo strip" />
          </div>
          <div className="strip-actions">
            <button onClick={onReset} disabled={!filled || running}><Icon name="refresh" size={17} /> Ulangi</button>
            <button className="download" onClick={onNext} disabled={!full || running}>
              Lanjut hias <Icon name="arrow" size={17} />
            </button>
          </div>
          {!full && <p className="demo-note">Ambil {n - filled} foto lagi untuk lanjut</p>}
        </div>
      </div>
    </div>
  )
}
