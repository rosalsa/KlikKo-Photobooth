import type { Template } from '../lib/templates'
import { Icon } from './Icon'
import { StripCanvas } from './StripCanvas'

export function FramePicker({
  templates,
  currentId,
  onPick,
  onBack,
  title,
  numbers = true,
  showCount = false,
}: {
  templates: Template[]
  currentId: string | null
  onPick: (t: Template) => void
  onBack: () => void
  title: string
  numbers?: boolean
  showCount?: boolean
}) {
  return (
    <div className="kpop-picker">
      <div className="kpop-head">
        <button className="mini-btn" onClick={onBack}>
          <Icon name="back" size={15} /> Pilih ukuran lain
        </button>
        <h3>{title}</h3>
      </div>
      <div className="kpop-grid">
        {templates.map((t) => (
          <button
            key={t.id}
            className={`kpop-card ${currentId === t.id ? 'active' : ''}`}
            onClick={() => onPick(t)}
            aria-label={`Pilih ${t.name}, ${t.slots} foto`}
          >
            <StripCanvas template={t} photos={Array(t.slots).fill(null)} maxWidth={300} numbers={numbers} />
            <span className="kpop-name">{t.name}</span>
            {showCount && <span className="kpop-meta">{t.slots} foto</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
