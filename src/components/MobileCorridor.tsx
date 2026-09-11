import { useEffect, useMemo, useRef, useState } from 'react'
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

/**
 * SALONDAKI ZIYARETCILER
 *
 * Her ziyaretci belirli bir ESERIN onunde durur. Ray kaydirildiginda onunla
 * birlikte gelir, birlikte gider - cunku figurler rayin kendi icinde, mutlak
 * konumlu cocuklar olarak yasar. Kaydirmayi tarayici yaptigi icin arada tek bir
 * kare bile kayma olmaz.
 *
 * Onceki surumde figurler zeminde, ayri bir katmandaydi: eserler gecip
 * gidiyor, ziyaretciler oldugu yerde kaliyordu. Ayni salonda degil, ust uste
 * bindirilmis iki ayri sahne gibi duruyorlardi.
 */
type Visitor = {
  /** Onunde durdugu eserin sirasi. */
  card: number
  variant: number
  /** Eserin tam onunu kapatmasin diye saga ya da sola kayar. */
  side: -1 | 1
  /** On sirada mi duruyor? (Yatay salondaki on/arka katman ayrimi.) */
  front: boolean
  /** Duvar boyunca agir agir gezinenler; gerisi esere bakip duruyor. */
  amble: boolean
}

/** Kac eserde bir salona bir ziyaretci dusuyor. */
const CROWD_STEP = 4

function buildCrowd(total: number): Visitor[] {
  const out: Visitor[] = []
  for (let i = 0, c = 1; c < total; i++, c += CROWD_STEP + (i % 3)) {
    out.push({
      card: c,
      variant: i % 5,
      side: i % 2 ? 1 : -1,
      front: i % 3 !== 0,
      // Dortte biri geziniyor: bir muzede cogunluk durur, azinlik yurur.
      amble: i % 4 === 1,
    })
  }
  return out
}

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
  const crowd = useMemo(() => buildCrowd(frames.length), [frames.length])
  const crowdNodes = useRef<(HTMLDivElement | null)[]>([])

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

      // Ziyaretciler eserlerinin onune. Kart genisligi gorseller indikce
      // degistigi icin bu her yeniden olcumde tazelenir.
      crowd.forEach((v, i) => {
        const node = crowdNodes.current[i]
        const card = cards[v.card]
        if (!node || !card) return
        const x = card.offsetLeft + card.offsetWidth * (0.5 + v.side * 0.42)
        node.style.left = `${Math.round(x)}px`
      })
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
  }, [onVisible, crowd])

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

      {/*
        Zemin rayin ALTINDA duruyor. Ziyaretciler rayin icinde yasadigi icin
        sira boyle olmak zorunda: yoksa zemin onlarin ustune boyanir ve
        figurler halinin altinda kalirdi.
      */}
      <div className="corridor-floor" aria-hidden="true">
        <div className="corridor-boards" />
        <div
          className="corridor-reflection"
          style={{ backgroundImage: `url("${frames[center]?.photo.lqip ?? ''}")` }}
        />
        <div className="corridor-carpet" />
      </div>

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

        {crowd.map((v, i) => (
          <div
            key={i}
            ref={(el) => {
              crowdNodes.current[i] = el
            }}
            className={`corridor-visitor${v.front ? ' is-front' : ''}${
              v.amble ? ' is-amble' : ' is-still'
            }`}
            style={{
              // Eserin solunda duran saga, sagindaki sola bakar.
              ['--face' as string]: -v.side,
              ['--amble-dur' as string]: `${44 + (i % 5) * 7}s`,
              animationDelay: `${-i * 6.5}s`,
            }}
            aria-hidden="true"
          >
            <Silhouette variant={v.variant} className="visitor-svg" />
          </div>
        ))}
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
