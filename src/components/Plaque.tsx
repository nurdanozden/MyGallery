import type { FramePlacement } from '../types'

type Props = {
  frame: FramePlacement
  total: number
  onPrev?: () => void
  onNext?: () => void
  onClose?: () => void
  variant?: 'wall' | 'sheet'
}

/** Duvara monte pirinç künye: eser adı, hikâye ve teknik değerler. */
export function Plaque({ frame, total, onPrev, onNext, onClose, variant = 'wall' }: Props) {
  const { photo } = frame
  const { exif } = photo
  // Kunye alanlari otomatik doldugu icin bos kalabilir; bos satir gostermeyiz.
  const origin = [photo.place, photo.year].filter(Boolean).join(', ')
  const specs = [exif.lens, exif.aperture, exif.shutter, exif.iso].filter(Boolean)

  return (
    <aside className={`plaque plaque-${variant}`} onClick={(e) => e.stopPropagation()}>
      <div className="plaque-screws" aria-hidden="true">
        <i />
        <i />
      </div>

      <p className="plaque-index">
        {String(frame.index + 1).padStart(2, '0')} <span>/</span> {String(total).padStart(2, '0')}
      </p>

      <h2 className="plaque-title">{photo.title}</h2>
      {origin && <p className="plaque-origin">{origin}</p>}

      <div className="plaque-hair" aria-hidden="true" />

      {photo.story && <p className="plaque-story">{photo.story}</p>}

      {specs.length > 0 && (
        <p className="plaque-exif">
          {specs.map((s, i) => (
            <span key={s + i}>
              {i > 0 && <span>|</span>} {s}
            </span>
          ))}
        </p>
      )}

      <div className="plaque-nav">
        <button type="button" onClick={onPrev} aria-label="Önceki eser">
          ←
        </button>
        <button type="button" className="plaque-close" onClick={onClose}>
          Salona dön <em>ESC</em>
        </button>
        <button type="button" onClick={onNext} aria-label="Sonraki eser">
          →
        </button>
      </div>
    </aside>
  )
}
