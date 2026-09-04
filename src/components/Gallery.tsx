import { useEffect, useRef } from 'react'
import type { FramePlacement } from '../types'
import {
  DESIGN,
  PERSPECTIVE,
  ROOM,
  WIDE_CAMERA,
  cameraTransform,
  focusCamera,
  frameSize,
  panRange,
} from '../lib/room'
import type { Camera } from '../lib/room'
import { Visitors } from './Visitors'

type Props = {
  frames: FramePlacement[]
  hallWidth: number
  sources: string[]
  focusIndex: number | null
  hovered: number | null
  scale: number
  reducedMotion: boolean
  onHover: (i: number | null) => void
  onSelect: (i: number) => void
  onBackdrop: () => void
  onVisitorCount: (n: number) => void
}

const px = (n: number) => `${n}px`
const TWEEN_MS = 1400

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const lerpCamera = (a: Camera, b: Camera, t: number): Camera => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
  rx: a.rx + (b.rx - a.rx) * t,
  ry: a.ry + (b.ry - a.ry) * t,
  dist: a.dist + (b.dist - a.dist) * t,
})

function Artwork({
  f,
  src,
  focused,
  onHover,
  onSelect,
}: {
  f: FramePlacement
  src: string
  focused: boolean
  onHover: (i: number | null) => void
  onSelect: (i: number) => void
}) {
  const size = frameSize(f.photo.orientation)
  const left = f.u - f.w / 2
  const top = f.v - f.h / 2

  return (
    <div className={`art${focused ? ' is-active' : ''}`} style={{ ['--i' as string]: f.index }}>
      {/* Tavandan tabloya inen konik spot */}
      <div
        className="spot-cone"
        style={{ left: px(f.u - f.w * 1.15), width: px(f.w * 2.3), height: px(ROOM.H) }}
        aria-hidden="true"
      />
      <div
        className="spot-wash"
        style={{
          left: px(f.u - f.w * 0.95),
          top: px(top - f.h * 0.4),
          width: px(f.w * 1.9),
          height: px(f.h * 1.8),
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
          <img className="frame-photo" src={src} alt={f.photo.title} draggable={false} />
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
}

export function Gallery({
  frames,
  hallWidth,
  sources,
  focusIndex,
  hovered,
  scale,
  reducedMotion,
  onHover,
  onSelect,
  onBackdrop,
  onVisitorCount,
}: Props) {
  const worldRef = useRef<HTMLDivElement>(null)
  const cam = useRef<Camera>({ ...WIDE_CAMERA })
  const pan = useRef(0)
  const tween = useRef<{ from: Camera; to: Camera; t0: number } | null>(null)
  const focusRef = useRef(focusIndex)
  const framesRef = useRef(frames)

  useEffect(() => {
    framesRef.current = frames
  }, [frames])

  const limit = panRange(hallWidth)

  /**
   * Kamera rig'i: odak degisimlerinde ease-in-out bir tween, salonda gezinirken
   * imlece yumusakca yetisen serbest bir takip. Ziyaretci siluetleri de ayni
   * degerlerden beslensin diye acilar CSS degiskeni olarak yaziliyor.
   */
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const idx = focusRef.current
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
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Odak degistiginde kamerayi tween ile tasi.
  useEffect(() => {
    focusRef.current = focusIndex
    const to =
      focusIndex === null ? { ...WIDE_CAMERA, x: pan.current } : focusCamera(frames[focusIndex])
    tween.current = { from: { ...cam.current }, to, t0: performance.now() }
  }, [focusIndex, frames])

  // Imlec kenarlara yaklastikca duvar boyunca yuru; ortada genis bir olu bolge var.
  useEffect(() => {
    if (limit <= 0) return
    const onMove = (e: PointerEvent) => {
      const n = (e.clientX / window.innerWidth) * 2 - 1
      const dead = 0.24
      const m = Math.abs(n) < dead ? 0 : (Math.sign(n) * (Math.abs(n) - dead)) / (1 - dead)
      pan.current = m * limit
    }
    const onKey = (e: KeyboardEvent) => {
      if (focusRef.current !== null) return
      if (e.key === 'ArrowRight') pan.current = Math.min(limit, pan.current + 180)
      if (e.key === 'ArrowLeft') pan.current = Math.max(-limit, pan.current - 180)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [limit])

  const half = hallWidth / 2

  return (
    <div className={`stage${focusIndex !== null ? ' is-focused' : ''}`} onClick={onBackdrop}>
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
            {/* Zemin */}
            <div
              className="floor"
              style={{
                width: px(hallWidth),
                height: px(ROOM.HALL),
                transform: `translate3d(${-half}px, 0, 0) rotateX(90deg)`,
              }}
            >
              {frames.map((f) => (
                <div
                  key={`pool-${f.index}`}
                  className="light-pool"
                  style={{
                    left: px(f.u - 240),
                    top: px(-40),
                    width: px(480),
                    height: px(400),
                  }}
                  aria-hidden="true"
                />
              ))}
              <div className="floor-dim" aria-hidden="true" />
              {frames.map((f) => (
                <div
                  key={`refl-${f.index}`}
                  className="floor-reflection"
                  style={{
                    left: px(f.u - f.w / 2),
                    top: 0,
                    width: px(f.w),
                    height: px(f.h * 1.9),
                  }}
                  aria-hidden="true"
                >
                  <img src={sources[f.index]} alt="" draggable={false} />
                </div>
              ))}
            </div>

            {/* Tavan */}
            <div
              className="ceiling"
              style={{
                width: px(hallWidth),
                height: px(ROOM.HALL),
                transform: `translate3d(${-half}px, ${-ROOM.H}px, 0) rotateX(90deg)`,
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
              className="wall wall-back"
              style={{
                width: px(hallWidth),
                height: px(ROOM.H),
                transform: `translate3d(${-half}px, ${-ROOM.H}px, 0)`,
              }}
            >
              <div className="wall-skirting" aria-hidden="true" />
              <div className="wall-dim" aria-hidden="true" />
              {frames.map((f) => (
                <Artwork
                  key={f.index}
                  f={f}
                  src={sources[f.index]}
                  focused={focusIndex === f.index}
                  onHover={onHover}
                  onSelect={onSelect}
                />
              ))}
            </div>

            <Visitors
              frames={frames}
              hallWidth={hallWidth}
              hoveredFrame={focusIndex === null ? hovered : null}
              dimmed={focusIndex !== null}
              onCountChange={onVisitorCount}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
      <div className="vignette" aria-hidden="true" />
    </div>
  )
}
