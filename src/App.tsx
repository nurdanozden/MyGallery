import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { photos } from './content/photos'
import { exhibition } from './content/exhibition'
import { resolvePhoto } from './lib/photoSources'
import { DESIGN, layoutFrames } from './lib/room'
import { useMediaQuery, useViewport } from './lib/useViewport'
import { Ambience } from './lib/ambience'
import { TicketGate } from './components/TicketGate'
import { Gallery } from './components/Gallery'
import { Plaque } from './components/Plaque'
import { Hud } from './components/Hud'
import { MobileCorridor } from './components/MobileCorridor'

export default function App() {
  const layout = useMemo(() => layoutFrames(photos), [])
  const frames = layout.frames
  const sources = useMemo(() => photos.map((p) => resolvePhoto(p).src), [])

  const [phase, setPhase] = useState<'gate' | 'hall'>('gate')
  const [gateShown, setGateShown] = useState(true)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [audioOn, setAudioOn] = useState(false)
  const [visitorCount, setVisitorCount] = useState(4)
  const [hint, setHint] = useState<string | null>(null)

  const viewport = useViewport()
  const isMobile = useMediaQuery('(max-width: 860px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const ambience = useRef<Ambience | null>(null)
  const isMobileRef = useRef(false)

  useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  const scale = useMemo(() => {
    const k = Math.max(viewport.w / DESIGN.w, viewport.h / DESIGN.h)
    return Math.min(2.1, Math.max(0.62, k))
  }, [viewport])

  const flash = useCallback((text: string, ms = 5200) => {
    setHint(text)
    window.setTimeout(() => setHint((h) => (h === text ? null : h)), ms)
  }, [])

  const setAudio = useCallback((on: boolean) => {
    ambience.current ??= new Ambience()
    if (on) void ambience.current.start()
    else ambience.current.stop()
    setAudioOn(on)
  }, [])

  const enter = useCallback(() => {
    setPhase('hall')
    setAudio(true)
    flash(
      isMobileRef.current
        ? 'Kaydırın · esere dokunun'
        : 'Salonda gezinmek için kenarlara yaklaşın · esere tıklayın',
      7500,
    )
    window.setTimeout(() => setGateShown(false), 1500)
  }, [setAudio, flash])

  useEffect(() => () => ambience.current?.stop(), [])

  const step = useCallback(
    (dir: 1 | -1) => {
      setFocusIndex((i) => {
        if (i === null) return i
        return (i + dir + frames.length) % frames.length
      })
    },
    [frames.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'hall') return
      if (e.key === 'Escape' && !gateShown) setFocusIndex(null)
      if (focusIndex === null) return
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, gateShown, focusIndex, step])

  const focused = focusIndex !== null ? frames[focusIndex] : null

  return (
    <main className={`app${phase === 'hall' ? ' is-open' : ''}`}>
      {phase === 'hall' && (
        <>
          {isMobile ? (
            <MobileCorridor
              frames={frames}
              sources={sources}
              focusIndex={focusIndex}
              onSelect={setFocusIndex}
              onClose={() => setFocusIndex(null)}
              onStep={step}
              onVisible={setHovered}
            />
          ) : (
            <Gallery
              frames={frames}
              hallWidth={layout.width}
              sources={sources}
              focusIndex={focusIndex}
              hovered={hovered}
              scale={scale}
              reducedMotion={reducedMotion}
              onHover={setHovered}
              onSelect={setFocusIndex}
              onBackdrop={() => setFocusIndex(null)}
              onVisitorCount={setVisitorCount}
            />
          )}

          {!isMobile && focused && (
            <Plaque
              key={focused.index}
              frame={focused}
              total={frames.length}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onClose={() => setFocusIndex(null)}
            />
          )}

          {/* Mobilde kunye tam ekran acilinca arayuz cekilir */}
          {!(isMobile && focused) && (
            <Hud
              audioOn={audioOn}
              onToggleAudio={() => setAudio(!audioOn)}
              onOpenTicket={() => setGateShown(true)}
              visitorCount={isMobile ? Math.max(2, visitorCount) : visitorCount}
              hint={hint}
            />
          )}
        </>
      )}

      {gateShown && (
        <TicketGate
          photoCount={photos.length}
          onEnter={enter}
          dismissible={phase === 'hall'}
          onDismiss={() => setGateShown(false)}
        />
      )}

      <h1 className="sr-only">
        {exhibition.title} — {exhibition.subtitle}
      </h1>
    </main>
  )
}
