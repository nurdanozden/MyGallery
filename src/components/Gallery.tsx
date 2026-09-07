import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { FramePlacement } from '../types'
import {
  DESIGN,
  PERSPECTIVE,
  CARPET,
  ROOM,
  WALL_SCALE,
  WIDE_CAMERA,
  cameraTransform,
  focusCamera,
  focusFill,
  frameSize,
  panProgress,
  panRange,
  surfaceLeft,
  surfaceSpan,
  visibleRing,
} from '../lib/room'
import type { Camera, Ring } from '../lib/room'
import type { Footstep } from '../lib/ambience'
import { prefetch } from '../lib/photoSources'
import { PhotoImg } from './PhotoImg'
import { Visitors } from './Visitors'

type Props = {
  frames: FramePlacement[]
  hallWidth: number
  viewportWidth: number
  focusIndex: number | null
  hovered: number | null
  scale: number
  reducedMotion: boolean
  onHover: (i: number | null) => void
  onSelect: (i: number) => void
  onBackdrop: () => void
  onVisitorCount: (n: number) => void
  onFootstep?: (step: Footstep) => void
}

const px = (n: number) => `${n}px`
const TWEEN_MS = 1400

/** Halka kaç ms'de bir yeniden hesaplansın (her karede değil). */
const RING_MS = 140

/** Kenarda tam yürüyüşte saniyede kaç ekran dolusu duvar geçilir. */
const WALK_SPEED = 1.6
/** Tekerlek bir çentikte ne kadar ilerletir (ekran dolusu). */
const WHEEL_STEP = 0.5

/**
 * Spot ışıkları sırayla yanar. Gecikme eserin duvardaki SIRA NUMARASINA değil,
 * ekrana girdiği andaki sırasına bakar ve burada kesilir: yoksa duvarın
 * ellinci eserinin ışığı 50 * 150ms = 7,5 saniye sonra yanardı, ziyaretçi de
 * salonun yarısını karanlıkta gezerdi.
 */
const REVEAL_CAP = 8

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const lerpCamera = (a: Camera, b: Camera, t: number): Camera => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
  rx: a.rx + (b.rx - a.rx) * t,
  ry: a.ry + (b.ry - a.ry) * t,
  dist: a.dist + (b.dist - a.dist) * t,
})

const Artwork = memo(function Artwork({
  f,
  focused,
  visible,
  order,
  scale,
  onHover,
  onSelect,
}: {
  f: FramePlacement
  focused: boolean
  /** Ekranda mı, yoksa gezinme yönünde bekleyen bir eser mi? */
  visible: boolean
  /** Spotun yanma sırası — eser ekrana girdiği anda sabitlenir. */
  order: number
  scale: number
  onHover: (i: number | null) => void
  onSelect: (i: number) => void
}) {
  const size = frameSize(f.photo)
  const left = f.u - f.w / 2
  const top = f.v - f.h / 2

  // Halka kayarken sıra değişirse animasyon baştan başlar ve ışık titrer;
  // bu yüzden ilk karedeki değer dondurulur.
  const [reveal] = useState(order)

  // Baskının ekrandaki gerçek genişliği: duvar uzakta olduğu için küçülür,
  // odak modunda kamera yaklaştığı için büyür. `sizes` bunu bilmeli.
  const shown = size.inner.w * scale * (focused ? focusFill(f.h) : WALL_SCALE)

  return (
    <div className={`art${focused ? ' is-active' : ''}`} style={{ ['--i' as string]: reveal }}>
      {/* Tavandan tabloya inen konik spot */}
      <div
        className="spot-cone"
        style={{ left: px(f.u - f.w * 1.2), width: px(f.w * 2.4), height: px(ROOM.H) }}
        aria-hidden="true"
      />
      <div
        className="spot-wash"
        style={{
          left: px(f.u - f.w * 1.15),
          top: px(top - f.h * 0.45),
          width: px(f.w * 2.3),
          height: px(f.h * 1.9),
        }}
        aria-hidden="true"
      />
      <div className="spot-fixture" style={{ left: px(f.u - 14) }} aria-hidden="true" />

      <button
        type="button"
        className={`frame${focused ? ' is-focused' : ''}`}
        style={{
          left: px(left),
          top: px(top),
          width: px(f.w),
          height: px(f.h),
          borderWidth: px(size.moulding),
        }}
        onPointerEnter={() => onHover(f.index)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(f.index)}
        onBlur={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(f.index)
        }}
        aria-label={`${f.photo.title} — ${f.photo.place}, ${f.photo.year}`}
      >
        <span className="frame-mat" style={{ padding: px(size.mat) }}>
          <PhotoImg
            className="frame-photo"
            photo={f.photo}
            alt={f.photo.title}
            sizes={`${Math.round(shown)}px`}
            eager
            priority={visible ? 'high' : 'low'}
          />
        </span>
        <span className="frame-glass" aria-hidden="true" />
      </button>

      {/* Duvara vidalanmis kucuk pirinc kunye plakasi */}
      <div
        className="wall-plate"
        style={{ left: px(f.u + f.w / 2 + 18), top: px(f.v + f.h * 0.16) }}
        aria-hidden="true"
      >
        <span />
        <span />
      </div>
    </div>
  )
})

export function Gallery({
  frames,
  hallWidth,
  viewportWidth,
  focusIndex,
  hovered,
  scale,
  reducedMotion,
  onHover,
  onSelect,
  onBackdrop,
  onVisitorCount,
  onFootstep,
}: Props) {
  const worldRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Sergi kronolojik asildigi icin salona duvarin BASINDAN girilir; 100 eserde
  // ortadan baslamak ziyaretciyi 50. karenin onune birakirdi.
  const start = -panRange(hallWidth, viewportWidth, scale)
  const cam = useRef<Camera>({ ...WIDE_CAMERA, x: start })
  const pan = useRef(start)
  /** İmlecin kenara ne kadar yaklaştığı (-1..1) — panoramanın yürüme hızı. */
  const walk = useRef(0)
  const tween = useRef<{ from: Camera; to: Camera; t0: number } | null>(null)
  const focusRef = useRef(focusIndex)
  const framesRef = useRef(frames)

  /**
   * Salonun BOYALI yüzeyleri: zemin, tavan, arka duvar ve halı. Duvarın tamamı
   * kadar geniş değiller — kameranın etrafında kayan birer pencere. İçlerindeki
   * surface-inner katmanı ise duvar koordinatında durur, böylece eserler, ışık
   * havuzları ve yansımalar dünyadaki yerlerinden kıpırdamaz.
   */
  const floorRef = useRef<HTMLDivElement>(null)
  const ceilingRef = useRef<HTMLDivElement>(null)
  const wallRef = useRef<HTMLDivElement>(null)
  const poolsRef = useRef<HTMLDivElement>(null)
  const reflectionsRef = useRef<HTMLDivElement>(null)
  const artsRef = useRef<HTMLDivElement>(null)

  const span = useMemo(
    () => Math.min(hallWidth, surfaceSpan(viewportWidth, scale)),
    [hallWidth, viewportWidth, scale],
  )
  const surfaceRef = useRef({ span, hallWidth })
  /** Pencerenin en son taşındığı yer; her karede yeniden yazmamak için. */
  const placedRef = useRef(Number.NaN)
  /** İlk kare rAF çalışmadan çizilir; pencere daha o anda doğru yerde dursun. */
  const startLeft = surfaceLeft(start, span, hallWidth)

  useEffect(() => {
    surfaceRef.current = { span, hallWidth }
    // Ekran boyu degisti: React yuzeylere yeniden baslangic degerlerini yazdi,
    // pencere bir sonraki karede kameranin gercek yerine geri tasinsin.
    placedRef.current = Number.NaN
  }, [span, hallWidth, startLeft])

  /**
   * Yalnızca bu aralıktaki eserler DOM'a girer ve dosyaları indirilir.
   * Kamera duvar boyunca yürüdükçe halka onunla birlikte kayar.
   */
  const [ring, setRing] = useState<Ring>(() =>
    visibleRing(frames, start, viewportWidth, scale),
  )
  const ringRef = useRef(ring)

  useEffect(() => {
    framesRef.current = frames
  }, [frames])

  const limit = panRange(hallWidth, viewportWidth, scale)
  /** Ekranda bir bakista gorunen duvar parcasi - okların adım boyu. */
  const stride = (viewportWidth / (scale * WALL_SCALE)) * 0.72
  const limitRef = useRef(limit)
  const viewRef = useRef({ w: viewportWidth, scale })

  useEffect(() => {
    limitRef.current = limit
    // Ekran boyu degisince duvarin gidilebilir sinirlari da degisir.
    pan.current = Math.max(-limit, Math.min(limit, pan.current))
  }, [limit])

  useEffect(() => {
    viewRef.current = { w: viewportWidth, scale }
    setRing(visibleRing(framesRef.current, cam.current.x, viewportWidth, scale))
  }, [viewportWidth, scale])

  /**
   * Kamera rig'i: odak degisimlerinde ease-in-out bir tween, salonda gezinirken
   * imlece yumusakca yetisen serbest bir takip. Ziyaretci siluetleri de ayni
   * degerlerden beslensin diye acilar CSS degiskeni olarak yaziliyor.
   */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastRing = 0
    // Pencere yalnızca bir adım kaydığında taşınır; aradaki karelerde hiçbir
    // yüzey yeniden boyanmaz.
    const placeSurfaces = (camX: number) => {
      const { span: sp, hallWidth: hw } = surfaceRef.current
      const sx = surfaceLeft(camX, sp, hw)
      if (sx === placedRef.current) return
      placedRef.current = sx
      if (floorRef.current)
        floorRef.current.style.transform = `translate3d(${sx}px, 0, 0) rotateX(90deg)`
      if (ceilingRef.current)
        ceilingRef.current.style.transform = `translate3d(${sx}px, ${-ROOM.H}px, 0) rotateX(90deg)`
      if (wallRef.current)
        wallRef.current.style.transform = `translate3d(${sx}px, ${-ROOM.H}px, 0)`
      // Duvar koordinatındaki katmanlar pencerenin kaymasını geri alır.
      const inner = `${-hw / 2 - sx}px`
      if (poolsRef.current) poolsRef.current.style.left = inner
      if (reflectionsRef.current) reflectionsRef.current.style.left = inner
      if (artsRef.current) artsRef.current.style.left = inner
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const idx = focusRef.current
      if (idx === null && walk.current !== 0) {
        const v = viewRef.current
        const visible = v.w / (v.scale * WALL_SCALE)
        const lim = limitRef.current
        const next = pan.current + walk.current * visible * WALK_SPEED * dt
        pan.current = Math.max(-lim, Math.min(lim, next))
      }
      const target: Camera =
        idx === null ? { ...WIDE_CAMERA, x: pan.current } : focusCamera(framesRef.current[idx])

      const t = tween.current
      if (t) {
        const p = Math.min(1, (now - t.t0) / TWEEN_MS)
        cam.current = lerpCamera(t.from, t.to, easeInOut(p))
        if (p >= 1) tween.current = null
      } else {
        cam.current = lerpCamera(cam.current, target, 1 - Math.exp(-dt * 7))
      }

      const el = worldRef.current
      if (el) {
        el.style.transform = cameraTransform(cam.current)
        el.style.setProperty('--cam-rx', cam.current.rx.toFixed(3))
        el.style.setProperty('--cam-ry', cam.current.ry.toFixed(3))
      }
      placeSurfaces(cam.current.x)

      const stage = stageRef.current
      if (stage) {
        const done = panProgress(cam.current.x, limitRef.current)
        stage.style.setProperty('--progress', done.toFixed(4))
      }

      // Yükleme halkasını kameranın gerçek konumundan tazele — her karede değil,
      // ve yalnızca aralık değiştiyse React uyandırılır.
      if (now - lastRing > RING_MS) {
        lastRing = now
        const v = viewRef.current
        const next = visibleRing(framesRef.current, cam.current.x, v.w, v.scale)
        const cur = ringRef.current
        if (
          next.near0 !== cur.near0 ||
          next.near1 !== cur.near1 ||
          next.far0 !== cur.far0 ||
          next.far1 !== cur.far1
        ) {
          ringRef.current = next
          setRing(next)
        }
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Odak degistiginde kamerayi tween ile tasi.
  useEffect(() => {
    focusRef.current = focusIndex
    if (focusIndex !== null) walk.current = 0
    const to =
      focusIndex === null ? { ...WIDE_CAMERA, x: pan.current } : focusCamera(frames[focusIndex])
    tween.current = { from: { ...cam.current }, to, t0: performance.now() }
  }, [focusIndex, frames])

  // Odaktayken ok tuslariyla gecilecek komsu eserleri sessizce onden indir.
  useEffect(() => {
    if (focusIndex === null) return
    const id = window.setTimeout(() => {
      for (const d of [1, -1]) {
        const n = frames[(focusIndex + d + frames.length) % frames.length]
        if (n) prefetch(n.photo)
      }
    }, 600)
    return () => window.clearTimeout(id)
  }, [focusIndex, frames])

  /**
   * Imlec kenarlara yaklastikca duvar boyunca YURUNUR; ortada genis bir olu
   * bolge var. Imlecin konumu duvardaki konuma degil, yurume HIZINA baglanir:
   * 100 eserlik duvar 300 metreyi asiyor, mutlak esleme yapilsa bir piksel fare
   * hareketi bir eseri atlardi. Hiz esleme her koleksiyon boyunda ayni his verir.
   */
  useEffect(() => {
    if (limit <= 0) {
      walk.current = 0
      return
    }
    const onMove = (e: PointerEvent) => {
      if (focusRef.current !== null) {
        walk.current = 0
        return
      }
      const n = (e.clientX / window.innerWidth) * 2 - 1
      const dead = 0.24
      walk.current = Math.abs(n) < dead ? 0 : (Math.sign(n) * (Math.abs(n) - dead)) / (1 - dead)
    }
    const onLeave = () => {
      walk.current = 0
    }
    const nudgeTo = (d: number) => {
      pan.current = Math.max(-limit, Math.min(limit, pan.current + d))
    }
    const onKey = (e: KeyboardEvent) => {
      if (focusRef.current !== null) return
      if (e.key === 'ArrowRight') nudgeTo(stride)
      if (e.key === 'ArrowLeft') nudgeTo(-stride)
      if (e.key === 'Home') pan.current = -limit
      if (e.key === 'End') pan.current = limit
    }
    // Tekerlek ve trackpad: uzun duvarda hizli yol almanin kestirme yolu.
    const onWheel = (e: WheelEvent) => {
      if (focusRef.current !== null) return
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      nudgeTo(Math.sign(d) * Math.min(1, Math.abs(d) / 100) * stride * WHEEL_STEP)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      walk.current = 0
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [limit, stride])

  const half = hallWidth / 2

  // Halkanın içi + odaktaki eser: duvara asılan ve indirilen tek küme bu.
  const lo = focusIndex === null ? ring.far0 : Math.min(ring.far0, Math.max(0, focusIndex - 1))
  const hi =
    focusIndex === null
      ? ring.far1
      : Math.max(ring.far1, Math.min(frames.length - 1, focusIndex + 1))
  const hung = frames.slice(lo, hi + 1)

  /** Duvar koordinatinda duran seffaf katmanlarin ilk yeri. */
  const innerLeft = px(-half - startLeft)

  /**
   * Siluetin dunya konumunu sahnedeki duyulusuna cevirir: kameraya gore saga
   * sola savrulur, yaklastikca yukselir, halinin ustunde bogullasir.
   */
  const emitStep = (x: number, z: number, alpha: number) => {
    if (!onFootstep) return
    const visible = viewportWidth / (scale * WALL_SCALE) / 2
    const panned = (x - cam.current.x) / visible
    if (Math.abs(panned) > 1.15) return
    const near = Math.max(0, Math.min(1, (z - 90) / 330))
    const soft = z >= CARPET.from && z <= CARPET.from + CARPET.depth
    // Odak modunda salon geri plana cekilir, adimlar da uzaktan duyulur.
    const room = focusIndex === null ? 1 : 0.45
    onFootstep({ pan: panned, gain: alpha * room * (0.3 + 0.7 * near), soft })
  }

  const nudge = (dir: 1 | -1) => {
    pan.current = Math.max(-limit, Math.min(limit, pan.current + dir * stride))
  }

  return (
    <div
      ref={stageRef}
      className={`stage${focusIndex !== null ? ' is-focused' : ''}`}
      onClick={onBackdrop}
    >
      <div
        className="viewport"
        style={{
          width: px(DESIGN.w),
          height: px(DESIGN.h),
          marginLeft: px(-DESIGN.w / 2),
          marginTop: px(-DESIGN.h / 2),
          transform: `scale(${scale})`,
        }}
      >
        <div className="scene" style={{ perspective: px(PERSPECTIVE) }}>
          <div ref={worldRef} className="world">
            {/* Zemin — kamerayla birlikte kayan pencere */}
            <div
              ref={floorRef}
              className="floor"
              style={{
                width: px(span),
                height: px(ROOM.HALL),
                transform: `translate3d(${startLeft}px, 0, 0) rotateX(90deg)`,
              }}
            >
              {/* Salon boyunca uzanan kadife bordo hali */}
              <div
                className="carpet"
                style={{ top: px(CARPET.from), height: px(CARPET.depth) }}
                aria-hidden="true"
              >
                <span className="carpet-stitch carpet-stitch-a" />
                <span className="carpet-stitch carpet-stitch-b" />
                <span className="carpet-sheen" />
              </div>

              <div
                ref={poolsRef}
                className="surface-inner"
                style={{ left: innerLeft, width: px(hallWidth) }}
              >
                {hung.map((f) => (
                  <div
                    key={`pool-${f.index}`}
                    className="light-pool"
                    style={{
                      left: px(f.u - 290),
                      top: px(-50),
                      width: px(580),
                      height: px(540),
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <div className="floor-dim" aria-hidden="true" />

              <div
                ref={reflectionsRef}
                className="surface-inner"
                style={{ left: innerLeft, width: px(hallWidth) }}
              >
                {hung.map((f) => (
                  <div
                    key={`refl-${f.index}`}
                    className="floor-reflection"
                    style={{
                      left: px(f.u - f.w / 2),
                      top: 0,
                      width: px(f.w),
                      height: px(CARPET.from - 16),
                    }}
                    aria-hidden="true"
                  >
                    {/*
                      Yansima zaten 5px bulanik ve %19 opak; gomulu on izleme
                      burada gercek dosyadan ayirt edilemiyor. Halkadaki her eser
                      icin ikinci bir istek atmaktan boylece kurtuluyoruz.
                    */}
                    <img src={f.photo.lqip} alt="" draggable={false} />
                  </div>
                ))}
              </div>
            </div>

            {/* Tavan */}
            <div
              ref={ceilingRef}
              className="ceiling"
              style={{
                width: px(span),
                height: px(ROOM.HALL),
                transform: `translate3d(${startLeft}px, ${-ROOM.H}px, 0) rotateX(90deg)`,
              }}
            />

            {/* Yan duvarlar salonu kapatir; eserlerin tamami ana duvardadir */}
            <div
              className="wall wall-side"
              style={{
                width: px(ROOM.HALL),
                height: px(ROOM.H),
                transform: `translate3d(${-half}px, ${-ROOM.H}px, ${ROOM.HALL}px) rotateY(90deg)`,
              }}
            >
              <div className="wall-skirting" aria-hidden="true" />
              <div className="wall-dim" aria-hidden="true" />
            </div>
            <div
              className="wall wall-side"
              style={{
                width: px(ROOM.HALL),
                height: px(ROOM.H),
                transform: `translate3d(${half}px, ${-ROOM.H}px, 0) rotateY(-90deg)`,
              }}
            >
              <div className="wall-skirting" aria-hidden="true" />
              <div className="wall-dim" aria-hidden="true" />
            </div>

            <div
              ref={wallRef}
              className="wall wall-back"
              style={{
                width: px(span),
                height: px(ROOM.H),
                transform: `translate3d(${startLeft}px, ${-ROOM.H}px, 0)`,
              }}
            >
              <div className="wall-skirting" aria-hidden="true" />
              <div className="wall-dim" aria-hidden="true" />
              <div
                ref={artsRef}
                className="surface-inner surface-inner-3d"
                style={{ left: innerLeft, width: px(hallWidth), height: px(ROOM.H) }}
              >
                {hung.map((f, i) => (
                  <Artwork
                    key={f.index}
                    f={f}
                    focused={focusIndex === f.index}
                    visible={f.index >= ring.near0 && f.index <= ring.near1}
                    order={Math.min(i, REVEAL_CAP)}
                    scale={scale}
                    onHover={onHover}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>

            <Visitors
              frames={frames}
              range={[lo, hi]}
              hallWidth={hallWidth}
              hoveredFrame={focusIndex === null ? hovered : null}
              dimmed={focusIndex !== null}
              onCountChange={onVisitorCount}
              onFootstep={onFootstep ? emitStep : undefined}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
      <div className="vignette" aria-hidden="true" />

      {limit > 0 && focusIndex === null && (
        <>
          <button
            type="button"
            className="nav-arrow nav-arrow-left"
            onClick={(e) => {
              e.stopPropagation()
              nudge(-1)
            }}
            aria-label="Salonda sola ilerle"
          >
            <svg viewBox="0 0 24 40" aria-hidden="true">
              <path d="M17 3 5 20l12 17" />
            </svg>
          </button>
          <button
            type="button"
            className="nav-arrow nav-arrow-right"
            onClick={(e) => {
              e.stopPropagation()
              nudge(1)
            }}
            aria-label="Salonda sağa ilerle"
          >
            <svg viewBox="0 0 24 40" aria-hidden="true">
              <path d="M7 3l12 17L7 37" />
            </svg>
          </button>

          <div className="progress" aria-hidden="true">
            <span className="progress-fill" />
          </div>
        </>
      )}
    </div>
  )
}
