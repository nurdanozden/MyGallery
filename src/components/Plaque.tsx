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
      <p className="plaque-origin">
        {photo.place}, {photo.year}
      </p>

      <div className="plaque-hair" aria-hidden="true" />

      <p className="plaque-story">{photo.story}</p>

      <p className="plaque-exif">
        {exif.lens} <span>|</span> {exif.aperture} <span>|</span> {exif.shutter} <span>|</span>{' '}
        {exif.iso}
      </p>

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
