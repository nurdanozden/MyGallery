import { useEffect, useRef } from 'react'
import type { FramePlacement } from '../types'
import { Plaque } from './Plaque'
import { Silhouette } from './Silhouette'

type Props = {
  frames: FramePlacement[]
  sources: string[]
  focusIndex: number | null
  onSelect: (i: number) => void
  onClose: () => void
  onStep: (dir: 1 | -1) => void
  onVisible: (i: number) => void
}

const WALKERS = [
  { variant: 0, dur: 26, delay: 0, scale: 0.56, dir: 1 },
  { variant: 2, dur: 34, delay: -9, scale: 0.5, dir: -1 },
  { variant: 3, dur: 30, delay: -18, scale: 0.6, dir: 1 },
  { variant: 4, dur: 40, delay: -26, scale: 0.46, dir: -1 },
]

export function MobileCorridor({
  frames,
  sources,
  focusIndex,
  onSelect,
  onClose,
  onStep,
  onVisible,
}: Props) {
  const rail = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(-1)

  // Koridorda ortadaki eseri izleyip spot ışığını ona veriyoruz.
  useEffect(() => {
    const el = rail.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2
        const cards = Array.from(el.querySelectorAll<HTMLElement>('.corridor-art'))
        let best = 0
        let bestD = Infinity
        cards.forEach((c, i) => {
          const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
          if (d < bestD) {
            bestD = d
            best = i
          }
        })
        cards.forEach((c, i) => c.classList.toggle('is-center', i === best))
        if (best !== visibleRef.current) {
          visibleRef.current = best
          onVisible(best)
        }
      })
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
    }
  }, [onVisible])

  const focused = focusIndex !== null ? frames[focusIndex] : null

  return (
    <div className="corridor">
      <div className="corridor-ceiling" aria-hidden="true" />

      <div className="corridor-rail" ref={rail}>
        <div className="corridor-pad" aria-hidden="true" />
        {frames.map((f, i) => (
          <button
            key={f.index}
            type="button"
            className="corridor-art"
            onClick={() => onSelect(i)}
            aria-label={`${f.photo.title} — ${f.photo.place}, ${f.photo.year}`}
          >
            <span className="corridor-cone" aria-hidden="true" />
            <span className={`corridor-frame is-${f.photo.orientation}`}>
              <img src={sources[f.index]} alt={f.photo.title} draggable={false} />
            </span>
            <span className="corridor-caption">
              <em>{f.photo.title}</em>
              <i>
                {f.photo.place}, {f.photo.year}
              </i>
            </span>
          </button>
        ))}
        <div className="corridor-pad" aria-hidden="true" />
      </div>

      <div className="corridor-floor" aria-hidden="true">
        {WALKERS.map((w, i) => (
          <div
            key={i}
            className="corridor-walker"
            style={{
              animationDuration: `${w.dur}s`,
              animationDelay: `${w.delay}s`,
              ['--walk-scale' as string]: w.scale,
              ['--walk-dir' as string]: w.dir,
            }}
          >
            <Silhouette variant={w.variant} className="visitor-svg" />
          </div>
        ))}
      </div>

      {focused && (
        <div className="sheet" onClick={onClose}>
          <div className="sheet-photo" onClick={(e) => e.stopPropagation()}>
            <img src={sources[focused.index]} alt={focused.photo.title} />
          </div>
          <Plaque
            frame={focused}
            total={frames.length}
            variant="sheet"
            onPrev={() => onStep(-1)}
            onNext={() => onStep(1)}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  )
}
