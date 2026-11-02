import type { Template } from '../lib/templates'
import { Icon } from './Icon'
import { StripCanvas } from './StripCanvas'

export function KpopPicker({
  templates,
  currentId,
  onPick,
  onBack,
}: {
  templates: Template[]
  currentId: string | null
  onPick: (t: Template) => void
  onBack: () => void
}) {
  return (
    <div className="kpop-picker">
      <div className="kpop-head">
        <button className="mini-btn" onClick={onBack}>
          <Icon name="back" size={15} /> Pilih ukuran lain
        </button>
        <h3>MAU FOTO BARENG SIAPA?</h3>
      </div>
      <div className="kpop-grid">
        {templates.map((t) => (
          <button
            key={t.id}
            className={`kpop-card ${currentId === t.id ? 'active' : ''}`}
            onClick={() => onPick(t)}
            aria-label={`Pilih ${t.name}, ${t.slots} foto`}
          >
            <StripCanvas template={t} photos={Array(t.slots).fill(null)} maxWidth={300} numbers={false} />
            <span className="kpop-name">{t.name}</span>
            <span className="kpop-meta">{t.slots} foto</span>
          </button>
        ))}
      </div>
    </div>
  )
}
