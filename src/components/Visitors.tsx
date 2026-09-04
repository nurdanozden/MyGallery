import { useEffect, useRef, useState } from 'react'
import type { FramePlacement } from '../types'
import { Silhouette } from './Silhouette'

const POOL = 6
const SPEED = 46
const ARRIVE = 14
const AVOID_RADIUS = 230
/** Ziyaretcilerin dolastigi zemin seridi: duvardan kameraya dogru. */
const WALK_NEAR = 720
const WALK_FAR = 90

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
  facing: number
  tilt: number
  side: number
  opacity: number
  avoiding: boolean
  parked: { tx: number; tz: number; target: number | null } | null
  moving: boolean
}

type Props = {
  frames: FramePlacement[]
  hallWidth: number
  hoveredFrame: number | null
  dimmed: boolean
  onCountChange: (n: number) => void
  reducedMotion: boolean
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function clampToRoom(a: Agent, half: number) {
  a.x = Math.max(-half + 120, Math.min(half - 120, a.x))
  a.z = Math.max(WALK_FAR, Math.min(WALK_NEAR, a.z))
}

function makeAgents(frames: FramePlacement[]): Agent[] {
  return Array.from({ length: POOL }, (_, i) => {
    const f = frames[Math.floor((i * frames.length) / POOL) % Math.max(1, frames.length)]
    return {
      id: i,
      x: f ? f.standing.x : 0,
      z: rand(300, WALK_NEAR - 80),
      tx: f ? f.standing.x : 0,
      tz: f ? f.standing.z : 200,
      target: f ? f.index : null,
      phase: 'walk' as Phase,
      t: rand(0, 2),
      speed: SPEED * rand(0.8, 1.15),
      scale: rand(0.94, 1.06),
      facing: 1,
      tilt: 0,
      side: 0,
      opacity: 1,
      avoiding: false,
      parked: null,
      moving: true,
    }
  })
}

export function Visitors({
  frames,
  hallWidth,
  hoveredFrame,
  dimmed,
  onCountChange,
  reducedMotion,
}: Props) {
  const nodes = useRef<(HTMLDivElement | null)[]>([])
  const [agents] = useState(() => makeAgents(frames))
  const hoveredRef = useRef<number | null>(null)
  const framesRef = useRef(frames)
  const countRef = useRef(-1)
  const reportRef = useRef(onCountChange)

  useEffect(() => {
    hoveredRef.current = hoveredFrame
    framesRef.current = frames
    reportRef.current = onCountChange
  })

  useEffect(() => {
    if (!frames.length) return
    let raf = 0
    let last = performance.now()
    let churn = rand(24, 46)

    const pickTarget = (a: Agent) => {
      const list = framesRef.current
      const taken = new Set(
        agents.filter((o) => o !== a && o.target !== null).map((o) => o.target),
      )
      const free = list.filter((f) => !taken.has(f.index))
      const pool = free.length ? free : list
      const f = pool[Math.floor(Math.random() * pool.length)]
      a.target = f.index
      // Eserin tam onunu kapatmasin diye her zaman bir miktar yana kaysin.
      const side = Math.random() < 0.5 ? -1 : 1
      a.tx = f.standing.x + side * rand(58, 132)
      a.tz = f.standing.z + rand(-50, 90)
      a.phase = 'walk'
      a.moving = true
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
            a.z = WALK_NEAR - 30
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
              a.tz = a.z + (f.world.z - a.z) * 0.34
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
          leaver.tz = WALK_NEAR - 10
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
        el.style.opacity = a.opacity.toFixed(3)
        el.style.setProperty('--tilt', a.tilt.toFixed(3))
        el.style.setProperty('--side', a.side.toFixed(2))
        el.style.setProperty('--face', String(a.facing))
        el.style.setProperty('--scale', a.scale.toFixed(3))
        el.dataset.walking = a.moving ? 'yes' : 'no'
        el.dataset.pose = a.phase
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
        </div>
      ))}
    </div>
  )
}
