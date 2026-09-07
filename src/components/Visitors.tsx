import { useEffect, useRef, useState } from 'react'
import type { FramePlacement } from '../types'
import { Silhouette } from './Silhouette'

const POOL = 6
/** CSS yuruyus dongusu 0.86s = iki adim; ses de ayni tempoda dussun. */
const STEP_PERIOD = 0.43
const SPEED = 46
const ARRIVE = 14
const AVOID_RADIUS = 230
/** Ziyaretcilerin dolastigi zemin seridi: duvardan kameraya dogru. */
const WALK_NEAR = 415
const WALK_FAR = 90

/**
 * 2.5B derinlik: on plandaki figurler tam boy ve net, arkadakiler duvara bir iki
 * adim daha yakin, %78 olcekte ve yari saydam. Ikisi ust uste gelince salon
 * katmanli bir derinlik kazaniyor.
 */
const LAYER = {
  front: { offset: 95, scale: 1, alpha: 1 },
  back: { offset: -105, scale: 0.78, alpha: 0.65 },
} as const

type Phase = 'walk' | 'view' | 'approach' | 'ponder' | 'exit' | 'away'

type Agent = {
  id: number
  x: number
  z: number
  tx: number
  tz: number
  target: number | null
  phase: Phase
  t: number
  speed: number
  scale: number
  /** 0 = arka katman, 1 = on katman. */
  layer: 0 | 1
  /** Kalici durus: 0 elleri arkada one egik, 1 hafif yan duran, 2 dik ve uzun. */
  stance: 0 | 1 | 2
  facing: number
  tilt: number
  side: number
  opacity: number
  avoiding: boolean
  parked: { tx: number; tz: number; target: number | null } | null
  moving: boolean
  /** Bir sonraki adim sesine kalan sure. */
  stepClock: number
}

type Props = {
  frames: FramePlacement[]
  /**
   * Siluetlerin hedef secebilecegi eser araligi (dahil). 100 eserlik duvar
   * 300 metreyi asiyor; hedefler duvarin tamamindan secilseydi ziyaretciler
   * neredeyse hep kadraj disinda kalir, salon bos gorunurdu.
   */
  range?: [number, number]
  hallWidth: number
  hoveredFrame: number | null
  dimmed: boolean
  onCountChange: (n: number) => void
  onFootstep?: (x: number, z: number, alpha: number) => void
  reducedMotion: boolean
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Bu mesafeden uzaga yurumek yerine kadraj disinda isinlanilir (cm). */
const TELEPORT_AT = 2600

function clampToRoom(a: Agent, half: number) {
  a.x = Math.max(-half + 120, Math.min(half - 120, a.x))
  a.z = Math.max(WALK_FAR, Math.min(WALK_NEAR, a.z))
}

function makeAgents(frames: FramePlacement[], range?: [number, number]): Agent[] {
  // Ziyaretciler salona kameranin gordugu bolumden dagilir.
  const near = range ? frames.slice(range[0], range[1] + 1) : frames
  const list = near.length ? near : frames
  return Array.from({ length: POOL }, (_, i) => {
    const f = list[Math.floor((i * list.length) / POOL) % Math.max(1, list.length)]
    return {
      id: i,
      x: f ? f.standing.x : 0,
      z: rand(WALK_FAR + 40, WALK_NEAR - 60),
      tx: f ? f.standing.x : 0,
      tz: (f ? f.standing.z : 200) + (i % 2 === 1 ? LAYER.front.offset : LAYER.back.offset),
      target: f ? f.index : null,
      phase: 'walk' as Phase,
      t: rand(0, 2),
      speed: SPEED * rand(0.8, 1.15),
      scale: rand(0.94, 1.06),
      layer: (i % 2) as 0 | 1,
      stance: (i % 3) as 0 | 1 | 2,
      facing: 1,
      tilt: 0,
      side: 0,
      opacity: 1,
      avoiding: false,
      parked: null,
      moving: true,
      stepClock: 0,
    }
  })
}

export function Visitors({
  frames,
  range,
  hallWidth,
  hoveredFrame,
  dimmed,
  onCountChange,
  onFootstep,
  reducedMotion,
}: Props) {
  const nodes = useRef<(HTMLDivElement | null)[]>([])
  const [agents] = useState(() => makeAgents(frames, range))
  const hoveredRef = useRef<number | null>(null)
  const framesRef = useRef(frames)
  const rangeRef = useRef(range)
  const countRef = useRef(-1)
  const reportRef = useRef(onCountChange)
  const stepRef = useRef(onFootstep)

  useEffect(() => {
    hoveredRef.current = hoveredFrame
    framesRef.current = frames
    rangeRef.current = range
    reportRef.current = onCountChange
    stepRef.current = onFootstep
  })

  useEffect(() => {
    if (!frames.length) return
    let raf = 0
    let last = performance.now()
    let churn = rand(24, 46)

    const pickTarget = (a: Agent) => {
      const all = framesRef.current
      // Hedefler yalnizca kameranin yakinindaki eserlerden secilir.
      const r = rangeRef.current
      const near = r ? all.slice(r[0], r[1] + 1) : all
      const list = near.length ? near : all
      const taken = new Set(
        agents.filter((o) => o !== a && o.target !== null).map((o) => o.target),
      )
      const free = list.filter((f) => !taken.has(f.index))
      const pool = free.length ? free : list
      const f = pool[Math.floor(Math.random() * pool.length)]
      a.target = f.index
      // Eserin tam onunu kapatmasin diye her zaman bir miktar yana kaysin.
      const side = Math.random() < 0.5 ? -1 : 1
      const depth = a.layer === 1 ? LAYER.front.offset : LAYER.back.offset
      a.tx = f.standing.x + side * f.w * rand(0.78, 1.22)
      a.tz = Math.max(WALK_FAR, Math.min(WALK_NEAR, f.standing.z + depth + rand(-35, 35)))
      // Uzun duvarda hedef cok uzaktaysa oraya yurumek dakikalar surer; siluet
      // zaten kadraj disinda oldugu icin kimse gormeden yaklastiriyoruz.
      if (Math.abs(a.x - a.tx) > TELEPORT_AT) {
        a.x = a.tx + (a.x > a.tx ? 1 : -1) * rand(700, 1100)
        a.z = a.tz + rand(-40, 40)
      }
      a.phase = 'walk'
      a.moving = true
      a.stepClock = 0
    }

    const step = (dt: number) => {
      const list = framesRef.current
      const hovered = hoveredRef.current
      const hoverSpot = hovered !== null ? list[hovered]?.standing : undefined

      for (const a of agents) {
        a.t -= dt

        // Kullanıcı bir esere bakarken siluet onun görüş açısından çekilir.
        if (a.phase !== 'exit' && a.phase !== 'away') {
          const blocked =
            hoverSpot !== undefined &&
            Math.hypot(a.x - hoverSpot.x, a.z - hoverSpot.z) < AVOID_RADIUS
          if (blocked && !a.avoiding) {
            a.avoiding = true
            a.parked = { tx: a.tx, tz: a.tz, target: a.target }
            const away = a.x >= hoverSpot.x ? 1 : -1
            a.tx = hoverSpot.x + away * rand(260, 340)
            a.tz = hoverSpot.z + rand(30, 90)
            a.phase = 'walk'
            a.moving = true
            a.tilt = 0
          } else if (!blocked && a.avoiding) {
            a.avoiding = false
            if (a.parked) {
              a.tx = a.parked.tx
              a.tz = a.parked.tz
              a.target = a.parked.target
              a.parked = null
            }
            a.phase = 'walk'
            a.moving = true
          }
        }

        if (a.phase === 'away') {
          a.opacity += (0 - a.opacity) * Math.min(1, dt * 4)
          if (a.t <= 0) {
            a.x = rand(-hallWidth * 0.3, hallWidth * 0.3)
            a.z = WALK_NEAR - 24
            a.opacity = 0.001
            pickTarget(a)
          }
          continue
        }

        const dx = a.tx - a.x
        const dz = a.tz - a.z
        const d = Math.hypot(dx, dz)

        if (a.moving && d > ARRIVE) {
          const v = a.speed * dt
          a.x += (dx / d) * v
          a.z += (dz / d) * v
          if (Math.abs(dx) > 6) a.facing = dx > 0 ? 1 : -1
          clampToRoom(a, hallWidth / 2)

          // Bacaklar en acik konumdayken ayak yere basar; ses de o an duser.
          a.stepClock -= dt
          if (a.stepClock <= 0) {
            a.stepClock += STEP_PERIOD
            const alpha = a.layer === 1 ? LAYER.front.alpha : LAYER.back.alpha
            stepRef.current?.(a.x, a.z, alpha * a.opacity)
          }
        } else if (a.moving) {
          a.moving = false
          if (a.phase === 'exit') {
            a.phase = 'away'
            a.t = rand(5, 13)
          } else if (a.phase === 'walk') {
            a.phase = 'view'
            a.t = rand(3, 4.5)
            const f = a.target !== null ? list[a.target] : undefined
            if (f) a.facing = f.wall === 'right' ? -1 : f.wall === 'left' ? 1 : a.facing
          } else if (a.phase === 'approach') {
            a.phase = 'ponder'
            a.t = rand(1.6, 2.6)
            a.side = Math.random() < 0.5 ? -1 : 1
          }
        }

        if (!a.moving && a.t <= 0) {
          if (a.phase === 'view') {
            // Gözlemden sonra bir adım daha yaklaş.
            const f = a.target !== null ? list[a.target] : undefined
            if (f) {
              // Yana degil, sadece bir adim one; boylece eserin onunu kapatmaz.
              a.tx = a.x
              // Katman ayrimi bozulmasin diye kucuk bir adim.
              a.tz = a.z + (f.world.z - a.z) * 0.18
              a.phase = 'approach'
              a.moving = true
            } else {
              pickTarget(a)
            }
          } else if (a.phase === 'ponder') {
            a.side = 0
            pickTarget(a)
          }
        }

        const wantTilt =
          a.phase === 'view' || a.phase === 'approach' || a.phase === 'ponder' ? 1 : 0
        a.tilt += (wantTilt - a.tilt) * Math.min(1, dt * 2.4)
        a.opacity += (1 - a.opacity) * Math.min(1, dt * 2)
      }

      // Zaman zaman biri salondan ayrılsın, biraz sonra yenisi gelsin.
      churn -= dt
      if (churn <= 0) {
        churn = rand(26, 52)
        const here = agents.filter((a) => a.phase !== 'away' && a.phase !== 'exit')
        if (here.length > 2) {
          const leaver = here[Math.floor(Math.random() * here.length)]
          leaver.phase = 'exit'
          leaver.target = null
          leaver.avoiding = false
          leaver.parked = null
          leaver.tx = rand(-hallWidth * 0.3, hallWidth * 0.3)
          leaver.tz = WALK_NEAR - 6
          leaver.moving = true
          leaver.tilt = 0
        }
      }

      const alive = agents.filter((a) => a.phase !== 'away').length
      if (alive !== countRef.current) {
        countRef.current = alive
        reportRef.current(alive)
      }
    }

    const paint = () => {
      for (const a of agents) {
        const el = nodes.current[a.id]
        if (!el) continue
        el.style.transform = `translate3d(${a.x.toFixed(1)}px, 0, ${a.z.toFixed(1)}px)`
        const depth = a.layer === 1 ? LAYER.front : LAYER.back
        el.style.opacity = (a.opacity * depth.alpha).toFixed(3)
        el.style.setProperty('--tilt', a.tilt.toFixed(3))
        el.style.setProperty('--side', a.side.toFixed(2))
        el.style.setProperty('--face', String(a.facing))
        el.style.setProperty('--scale', (a.scale * depth.scale).toFixed(3))
        el.dataset.walking = a.moving ? 'yes' : 'no'
        el.dataset.pose = a.phase
        el.dataset.layer = a.layer === 1 ? 'front' : 'back'
        el.dataset.stance = String(a.stance)
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!reducedMotion) step(dt)
      paint()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [agents, frames.length, hallWidth, reducedMotion])

  return (
    <div className={`visitors${dimmed ? ' is-dimmed' : ''}`}>
      {Array.from({ length: POOL }, (_, i) => (
        <div
          key={i}
          className="visitor"
          ref={(el) => {
            nodes.current[i] = el
          }}
        >
          <div className="visitor-shadow" style={{ transform: 'rotateX(90deg)' }} />
          <div className="visitor-bb">
            <Silhouette variant={i} className="visitor-svg" />
          </div>
          <div className="visitor-contact" style={{ transform: 'rotateX(90deg)' }} />
        </div>
      ))}
    </div>
  )
}
