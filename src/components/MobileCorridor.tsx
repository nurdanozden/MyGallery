import { useEffect, useRef, useState } from 'react'
import type { FramePlacement } from '../types'
import { PhotoImg } from './PhotoImg'
import { Plaque } from './Plaque'
import { Silhouette } from './Silhouette'

type Props = {
  frames: FramePlacement[]
  focusIndex: number | null
  onSelect: (i: number) => void
  onClose: () => void
  onStep: (dir: 1 | -1) => void
  onVisible: (i: number) => void
}

type Lane = 'far' | 'mid' | 'near'

/**
 * Koridordaki ziyaretciler.
 *
 * Dizi UZAKTAN YAKINA sirali: DOM sirasi ayni zamanda ustuste binme sirasidir,
 * yani onden gecen bir figur arkadakini orter. Boy, yukseklik ve koyuluk
 * seritten (`lane`) gelir - hepsi CSS'te, tek yerde.
 *
 * `dir` hem YUZUN hem de YURUYUSUN yonu. Eskiden yalnizca yuzu cevirirdi ve
 * gecerli tek bir yuruyus animasyonu vardi: yuzu sola donuk iki figur saga
 * kayiyordu. Artik ters yon animasyonu `reverse` ile calisiyor.
 */
type Figure =
  | { kind: 'walk'; variant: number; lane: Lane; dur: number; delay: number; dir: 1 | -1 }
  | { kind: 'stand'; variant: number; lane: Lane; at: string; dir: 1 | -1 }

const FIGURES: Figure[] = [
  { kind: 'stand', variant: 1, lane: 'far', at: '13%', dir: 1 },
  { kind: 'walk', variant: 2, lane: 'far', dur: 44, delay: -11, dir: -1 },
  { kind: 'stand', variant: 3, lane: 'mid', at: '82%', dir: -1 },
  { kind: 'walk', variant: 4, lane: 'mid', dur: 33, delay: -17, dir: -1 },
  { kind: 'walk', variant: 3, lane: 'near', dur: 27, delay: -5, dir: 1 },
]

/** Kartın CSS'teki en geniş hali — tarayıcı srcset'ten doğru boyu seçsin diye. */
const CARD_SIZE = '66vw'

export function MobileCorridor({
  frames,
  focusIndex,
  onSelect,
  onClose,
  onStep,
  onVisible,
}: Props) {
  const rail = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(-1)
  /** Cilali zeminin yansitacagi eser: her zaman kadrajin ortasindaki. */
  const [center, setCenter] = useState(0)

  // Koridorda ortadaki eseri izleyip spot ışığını ona veriyoruz.
  useEffect(() => {
    const el = rail.current
    if (!el) return
    let raf = 0
    let cards: HTMLElement[] = []
    /**
     * Kart konumları kaydırma sırasında değişmez; 95 eserde her karede
     * offsetLeft okumak düzeni baştan hesaplatıp kaydırmayı takar. Bir kere
     * ölçüp saklıyoruz.
     *
     * Ama ilk ölçüm görseller yerleşmeden alınabiliyor ve bayat kalıyor; o
     * yüzden rayın toplam genişliğini de saklayıp her kaydırmada karşılaştırıyoruz
     * ve her görsel indiğinde yeniden ölçüyoruz. İkisi de tek bir özellik okuması.
     */
    let centers: number[] = []
    let measuredWidth = -1

    const measure = () => {
      cards = Array.from(el.querySelectorAll<HTMLElement>('.corridor-art'))
      centers = cards.map((c) => c.offsetLeft + c.offsetWidth / 2)
      measuredWidth = el.scrollWidth
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // Düzen değiştiyse (görsel indi, ekran döndü) ölçümü tazele.
        if (!centers.length || el.scrollWidth !== measuredWidth) measure()
        const mid = el.scrollLeft + el.clientWidth / 2
        let best = 0
        let bestD = Infinity
        for (let i = 0; i < centers.length; i++) {
          const d = Math.abs(centers[i] - mid)
          if (d < bestD) {
            bestD = d
            best = i
          }
        }
        if (best !== visibleRef.current) {
          const prev = visibleRef.current
          if (cards[prev]) cards[prev].classList.remove('is-center')
          if (cards[best]) cards[best].classList.add('is-center')
          visibleRef.current = best
          setCenter(best)
          onVisible(best)
        }
      })
    }

    const onResize = () => {
      measure()
      onScroll()
    }

    measure()
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    // `load` baloncuklanmaz, bu yüzden yakalama evresinde dinliyoruz.
    el.addEventListener('load', onResize, true)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      el.removeEventListener('load', onResize, true)
    }
  }, [onVisible])

  const focused = focusIndex !== null ? frames[focusIndex] : null

  return (
    <div className={`corridor${focused ? ' is-focused' : ''}`}>
      <div className="corridor-ceiling" aria-hidden="true" />

      {/*
        Dik tutulan telefonda salonun genel plani bir eserden fazlasini almiyor;
        muze hissi yan cevirince olusuyor. Giriste bir kez cakan ipucunu
        kaciran ziyaretci bunu baska turlu kesfedemezdi.
      */}
      <p className="corridor-rotate">
        <span aria-hidden="true">⟳</span>
        Yan çevirin · salonu gezin
      </p>

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
            <span className="corridor-frame">
              <PhotoImg
                photo={f.photo}
                alt={f.photo.title}
                sizes={CARD_SIZE}
                // İlk iki kart hemen, gerisi kaydırma yaklaştıkça.
                priority={i < 2 ? 'high' : 'low'}
              />
            </span>
            <span className="corridor-caption">
              <em>{f.photo.title}</em>
              <i>
                {[f.photo.place, f.photo.year].filter(Boolean).join(', ')}
              </i>
            </span>
          </button>
        ))}
        <div className="corridor-pad" aria-hidden="true" />
      </div>

      <div className="corridor-floor" aria-hidden="true">
        <div className="corridor-boards" />
        <div
          className="corridor-reflection"
          style={{ backgroundImage: `url("${frames[center]?.photo.lqip ?? ''}")` }}
        />
        <div className="corridor-carpet" />

        {FIGURES.map((f, i) =>
          f.kind === 'stand' ? (
            <div
              key={i}
              className={`corridor-stander is-${f.lane}`}
              style={{ left: f.at, ['--walk-dir' as string]: f.dir }}
            >
              <Silhouette variant={f.variant} className="visitor-svg" />
            </div>
          ) : (
            <div
              key={i}
              className={`corridor-walker is-${f.lane}`}
              style={{
                animationDuration: `${f.dur}s`,
                animationDelay: `${f.delay}s`,
                // Sola yuruyenler ayni animasyonu ters yonde oynatir.
                animationDirection: f.dir === -1 ? 'reverse' : undefined,
                ['--walk-dir' as string]: f.dir,
              }}
            >
              <Silhouette variant={f.variant} className="visitor-svg" />
            </div>
          ),
        )}
      </div>

      {focused && (
        <div className="sheet" onClick={onClose}>
          <div className="sheet-photo" onClick={(e) => e.stopPropagation()}>
            <PhotoImg
              photo={focused.photo}
              alt={focused.photo.title}
              sizes="100vw"
              priority="high"
            />
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
