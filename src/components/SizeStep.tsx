import { SLOT_OPTIONS, type Template } from '../lib/templates'
import { Icon } from './Icon'
import { StripCanvas } from './StripCanvas'

const copy: Record<number, { title: string; mood: string; desc: string }> = {
  2: { title: '2 FOTO', mood: 'QUICK SNAP', desc: 'Dua pose cepat. Simpel tapi tetap kece.' },
  3: { title: '3 FOTO', mood: 'SOLO VIBES', desc: 'Tiga pose, satu strip kenangan.' },
  4: { title: '4 FOTO', mood: 'BESTIE DUO', desc: 'Empat pose, empat ekspresi. Pas buat berdua.' },
  6: { title: '6 FOTO', mood: 'SQUAD GOALS', desc: 'Enam pose paling lengkap. Cocok buat ramean!' },
}

export function SizeStep({
  templatesFor,
  current,
  onPick,
}: {
  templatesFor: (n: number) => Template[]
  current: number | null
  onPick: (n: number) => void
}) {
  return (
    <div className="size-grid">
      {SLOT_OPTIONS.map((n, i) => {
        const tpl = templatesFor(n)[0]
        return (
          <button
            key={n}
            className={`size-card c${i} ${current === n ? 'active' : ''}`}
            onClick={() => onPick(n)}
            aria-label={`Pilih ${n} foto`}
          >
            <span className="size-mood">{copy[n].mood}</span>
            <div className="size-thumb">
              {tpl && <StripCanvas template={tpl} photos={Array(n).fill(null)} maxWidth={320} />}
            </div>
            <h3>{copy[n].title}</h3>
            <p>{copy[n].desc}</p>
            <span className="size-go">
              {current === n ? 'Dipilih' : 'Pilih ukuran ini'} <Icon name={current === n ? 'check' : 'arrow'} size={16} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
