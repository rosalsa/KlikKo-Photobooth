import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraStep } from './components/CameraStep'
import { EditStep } from './components/EditStep'
import { Icon } from './components/Icon'
import { SizeStep } from './components/SizeStep'
import { builtinTemplates, loadManifestTemplates, type Template } from './lib/templates'
import type { Sticker } from './lib/stickers'

const demoPhotos = [
  'https://images.unsplash.com/photo-1779398261162-a058a05d082d?crop=faces&fit=crop&w=900&h=700&q=85',
  'https://images.unsplash.com/photo-1777670881319-d304133879fb?crop=faces&fit=crop&w=900&h=700&q=85',
  'https://images.unsplash.com/photo-1588917512841-b500348ef4da?crop=faces&fit=crop&w=900&h=700&q=85',
]

type Step = 'size' | 'shoot' | 'edit'

const steps: { id: Step; num: string; label: string }[] = [
  { id: 'size', num: '01', label: 'UKURAN' },
  { id: 'shoot', num: '02', label: 'JEPRET' },
  { id: 'edit', num: '03', label: 'HIAS' },
]

function App() {
  const [step, setStep] = useState<Step>('size')
  const [n, setN] = useState<number | null>(null)
  const [shots, setShots] = useState<(string | null)[]>([])
  const [filterIndex, setFilterIndex] = useState(0)
  // Kamera dipegang di level App supaya izin cukup sekali dan stream tetap hidup antar langkah.
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState('')
  const [mirror, setMirror] = useState(true)
  const [timer, setTimer] = useState(3)
  const [auto, setAuto] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)
  const [stickers, setStickers] = useState<Sticker[]>([])

  const builtins = useMemo(() => builtinTemplates(), [])
  const [fileTemplates, setFileTemplates] = useState<Template[]>([])
  const [replaceBuiltin, setReplaceBuiltin] = useState(false)
  const [chosen, setChosen] = useState<Record<number, string>>({})

  const startCamera = useCallback(async () => {
    setCameraError('')
    if (streamRef.current?.getVideoTracks().some((t) => t.readyState === 'live')) {
      setStream(streamRef.current)
      return
    }

    // Browser hanya membuka API kamera di halaman aman (https:// atau localhost).
    // Di http://192.168.x.x (mis. dev server dibuka dari HP) navigator.mediaDevices tidak ada, dan popup izin tidak pernah muncul.
    if (!navigator.mediaDevices?.getUserMedia) {
      const inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|GSA\//i.test(navigator.userAgent)
      setCameraError(
        !window.isSecureContext
          ? 'Kamera hanya bisa dipakai lewat alamat https://. Buka versi online (https) dari website ini, atau pakai tombol kamera HP di bawah.'
          : inApp
            ? 'Browser di dalam aplikasi ini memblokir kamera. Buka lewat Chrome atau Safari, atau pakai tombol kamera HP di bawah.'
            : 'Browser ini tidak mendukung akses kamera. Pakai tombol kamera HP di bawah.',
      )
      return
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
      { video: { facingMode: 'user' }, audio: false },
      { video: true, audio: false },
    ]
    let lastErr: unknown = null
    for (const constraints of attempts) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(constraints)
        s.getVideoTracks().forEach((t) => {
          t.onended = () => {
            streamRef.current = null
            setStream(null)
          }
        })
        streamRef.current = s
        setStream(s)
        return
      } catch (err) {
        lastErr = err
        const name = (err as DOMException)?.name
        // Izin ditolak / kamera dipakai aplikasi lain: mencoba constraint lain tidak akan membantu.
        if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'NotReadableError' || name === 'NotFoundError') break
      }
    }

    const name = (lastErr as DOMException)?.name ?? 'Error'
    const inFrame = window.self !== window.top
    let msg: string
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      msg = inFrame
        ? 'Kamera diblokir karena halaman ini dibuka di dalam frame. Buka website ini di tab baru, lalu coba lagi.'
        : 'Izin kamera ditolak atau diblokir. Ketuk ikon gembok di address bar, izinkan Kamera untuk situs ini, lalu klik Aktifkan Kamera lagi.'
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      msg = 'Kamera tidak ditemukan di perangkat ini. Kamu bisa pakai tombol kamera HP di bawah.'
    } else if (name === 'NotReadableError' || name === 'AbortError') {
      msg = 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.'
    } else {
      msg = 'Kamera belum bisa dibuka. Coba lagi, atau pakai tombol kamera HP di bawah.'
    }
    setCameraError(`${msg} (kode: ${name})`)
  }, [])

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  useEffect(() => {
    loadManifestTemplates().then(({ templates, replaceBuiltin: rb }) => {
      setFileTemplates(templates)
      setReplaceBuiltin(rb)
    })
  }, [])

  // Template yang tampil selalu sesuai jumlah slot yang dipilih.
  const templatesFor = useCallback(
    (count: number) => {
      const own = fileTemplates.filter((t) => t.slots === count)
      const base = builtins.filter((t) => t.slots === count)
      return [...own, ...(replaceBuiltin && own.length ? [] : base)]
    },
    [fileTemplates, builtins, replaceBuiltin],
  )

  const list = n ? templatesFor(n) : []
  const template = n ? (list.find((t) => t.id === chosen[n]) ?? list[0]) : undefined

  const goBooth = () => {
    document.getElementById('booth')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickSize = (count: number) => {
    if (count !== n) {
      setShots((cur) => Array.from({ length: count }, (_, i) => cur[i] ?? null))
      setStickers([])
      setN(count)
    }
    setStep('shoot')
  }

  const resetAll = () => {
    if (!n) return
    setShots(Array(n).fill(null))
    setStickers([])
  }

  const goToStep = (target: Step) => {
    if (target === 'size') setStep('size')
    else if (target === 'shoot' && n) setStep('shoot')
    else if (target === 'edit' && n && shots.length === n && shots.every(Boolean)) setStep('edit')
  }

  const canGo = (target: Step) =>
    target === 'size' || (target === 'shoot' && !!n) || (target === 'edit' && !!n && shots.length === n && shots.every(Boolean))

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#" aria-label="KlikKo home">
          <img src={`${import.meta.env.BASE_URL}logo-klikko.png`} alt="KlikKo" />
        </a>
        <div className="nav-links">
          <a href="#how">Cara Main</a>
          <a href="#booth">Studio</a>
          <span className="live-pill"><i /> 100% Gratis</span>
        </div>
      </nav>

      <section className="hero">
        <div className="grain" />
        <div className="hero-copy">
          <div className="eyebrow"><Icon name="sparkle" size={16} /> YOUR POCKET-SIZED PHOTOBOOTH</div>
          <h1>MOMEN KECIL,<br /><span>MEMORI BESAR.</span></h1>
          <p>Every click has a story. Capture your favorite moments, make them yours, and keep the memories forever.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={goBooth}>
              <span><Icon name="camera" size={22} /></span> Buka Photobooth
            </button>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="burst">3...2...<br /><strong>CHEESE!</strong></div>
          <div className="tape tape-one" />
          <div className="polaroid polaroid-back">
            <img src={demoPhotos[1]} alt="" />
            <span>besties only!</span>
          </div>
          <div className="polaroid polaroid-front">
            <img src={demoPhotos[0]} alt="" />
            <span>good vibes 4ever</span>
            <b>♡</b>
          </div>
          <div className="doodle-star">✦</div>
          <div className="smiley">☺</div>
        </div>

      </section>

      <section className="booth-section" id="booth">
        <div className="section-heading">
          <span>01 / YOUR MINI STUDIO</span>
          <h2>OKAY, WAKTUNYA<br /><em>JADI MAIN CHARACTER.</em></h2>
          <p>Pilih ukuran, siapin pose terbaikmu, lalu klik. Hias hasilnya dengan stiker dan template favoritmu.</p>
        </div>

        <ol className="stepper" aria-label="Langkah photobooth">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                className={`${step === s.id ? 'active' : ''} ${canGo(s.id) ? '' : 'locked'}`}
                onClick={() => goToStep(s.id)}
                disabled={!canGo(s.id)}
                aria-current={step === s.id ? 'step' : undefined}
              >
                <b>{s.num}</b> {s.label}
                {s.id === 'size' && n ? <em>{n} foto</em> : null}
              </button>
            </li>
          ))}
        </ol>

        {step === 'size' && <SizeStep templatesFor={templatesFor} current={n} onPick={pickSize} />}

        {step === 'shoot' && n && template && (
          <CameraStep
            n={n}
            shots={shots}
            setShots={setShots}
            filterIndex={filterIndex}
            setFilterIndex={setFilterIndex}
            previewTemplate={template}
            stream={stream}
            cameraError={cameraError}
            onStartCamera={startCamera}
            mirror={mirror}
            setMirror={setMirror}
            timer={timer}
            setTimer={setTimer}
            auto={auto}
            setAuto={setAuto}
            onNext={() => goToStep('edit')}
            onReset={resetAll}
          />
        )}

        {step === 'edit' && n && template && (
          <EditStep
            n={n}
            shots={shots}
            templates={list}
            template={template}
            onTemplate={(id) => setChosen((c) => ({ ...c, [n]: id }))}
            stickers={stickers}
            setStickers={setStickers}
            onBack={() => setStep('shoot')}
          />
        )}
      </section>

      <section className="how-section" id="how">
        <div className="how-intro">
          <span>SUPER EASY, PROMISE</span>
          <h2>3 KLIK.<br />BANYAK CERITA.</h2>
        </div>
        <div className="steps">
          <article>
            <span className="step-num">01</span>
            <div className="step-icon pink"><Icon name="camera" size={28} /></div>
            <h3>PILIH & JEPRET</h3>
            <p>Pilih 2, 3, 4, atau 6 foto, lalu aktifkan kamera dan ambil pose paling ikonikmu.</p>
          </article>
          <article>
            <span className="step-num">02</span>
            <div className="step-icon purple"><Icon name="sparkle" size={28} /></div>
            <h3>PILIH VIBE</h3>
            <p>Natural, cherry, dreamy, atau klasik hitam putih. Ganti kapan saja.</p>
          </article>
          <article>
            <span className="step-num">03</span>
            <div className="step-icon yellow"><Icon name="download" size={28} /></div>
            <h3>HIAS & SIMPAN</h3>
            <p>Tempel stiker, ganti template, lalu download photostrip kamu.</p>
          </article>
        </div>
      </section>

      <footer>
        <div><span className="footer-star">✦</span><strong>MADE FOR<br />MEMORY MAKERS.</strong></div>
        <p>
          <a href="https://rosaliasalsabila.vercel.app/" target="_blank" rel="noopener noreferrer">KlikKo © 2026</a>
          <br />one pose, one memory at a time
        </p>
      </footer>

    </main>
  )
}

export default App
