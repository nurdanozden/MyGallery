import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { photos } from './content/photos'
import { exhibition } from './content/exhibition'
import { DESIGN, WALL_SCALE, frameSize, layoutFrames } from './lib/room'
import { useMediaQuery, useViewport } from './lib/useViewport'
import { Ambience } from './lib/ambience'
import type { Footstep } from './lib/ambience'
import { TicketGate } from './components/TicketGate'
import { Gallery } from './components/Gallery'
import { Plaque } from './components/Plaque'
import { Hud } from './components/Hud'
import { MobileCorridor } from './components/MobileCorridor'
import { Preload } from './components/Preload'

export default function App() {
  const layout = useMemo(() => layoutFrames(photos), [])
  const frames = layout.frames

  const [phase, setPhase] = useState<'gate' | 'hall'>('gate')
  const [gateShown, setGateShown] = useState(true)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [audioOn, setAudioOn] = useState(false)
  const [visitorCount, setVisitorCount] = useState(4)
  const [hint, setHint] = useState<string | null>(null)

  const viewport = useViewport()
  const isMobile = useMediaQuery('(max-width: 860px)')
  const isPortrait = useMediaQuery('(orientation: portrait)')
  const isTouch = useMediaQuery('(pointer: coarse)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  /**
   * Koridor yalnizca telefonu DIK tutana gosterilir. Dar ve yuksek bir kadrajda
   * salonun genel plani bir eserden fazlasini almiyor, muze hissi de olusmuyor.
   * Telefon YAN cevrildiginde masaustundeki gercek salon aciliyor: ayni duvar,
   * ayni spotlar, ayni hali - yalnizca gezinme parmakla.
   */
  const useCorridor = isMobile && isPortrait
  const ambience = useRef<Ambience | null>(null)
  const modeRef = useRef({ corridor: false, touch: false })
  const audioOnRef = useRef(false)

  useEffect(() => {
    modeRef.current = { corridor: useCorridor, touch: isTouch }
  }, [useCorridor, isTouch])

  useEffect(() => {
    audioOnRef.current = audioOn
  }, [audioOn])

  // Siluetlerin adımları salonun yankısından duyulur.
  const handleFootstep = useCallback((s: Footstep) => {
    if (audioOnRef.current) ambience.current?.footstep(s)
  }, [])

  /*
   * Olcek yalnizca yukseklikten: duvar hatti her ekranda ayni dikey oranda durur.
   * Alt sinir artik 1 degil: yan cevrilmis bir telefonda kadraj ~390px yuksek
   * oluyor ve olcek 1'de kalsaydi 490px'lik tasarim tuvalinin tavani ile zemini
   * kirpilirdi - salon tavansiz gorunurdu. 0.6'ya kadar kucultebiliyoruz.
   */
  const scale = useMemo(
    () => Math.min(3.4, Math.max(0.6, viewport.h / DESIGN.h)),
    [viewport.h],
  )

  /**
   * Bilet ekraninda beklenen birkac saniye bos gecmesin: ziyaretci salona
   * girdiginde ilk eserler cerceveye ASILMIS gelsin diye simdiden iniyorlar.
   * `sizes` duvardaki (ya da koridordaki) gercek genislikle ayni olmali, yoksa
   * tarayici srcset'ten baska bir boy secer ve dosya iki kere inerdi.
   */
  const preloadItems = useMemo(() => {
    if (phase !== 'gate') return []
    const wall = frames.slice(0, useCorridor ? 3 : 5)
    return wall.map((f) => ({
      photo: f.photo,
      sizes: useCorridor
        ? '66vw'
        : `${Math.round(frameSize(f.photo).inner.w * scale * WALL_SCALE)}px`,
    }))
  }, [phase, frames, useCorridor, scale])

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
    const m = modeRef.current
    flash(
      m.corridor
        ? 'Kaydırın · esere dokunun'
        : m.touch
          ? 'Salonu parmağınızla sürükleyin · esere dokunun'
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
          {useCorridor ? (
            <MobileCorridor
              frames={frames}
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
              viewportWidth={viewport.w}
              focusIndex={focusIndex}
              hovered={hovered}
              scale={scale}
              reducedMotion={reducedMotion}
              onHover={setHovered}
              onSelect={setFocusIndex}
              onBackdrop={() => setFocusIndex(null)}
              onVisitorCount={setVisitorCount}
              onFootstep={handleFootstep}
            />
          )}

          {!useCorridor && focused && (
            <Plaque
              key={focused.index}
              frame={focused}
              total={frames.length}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onClose={() => setFocusIndex(null)}
            />
          )}

          {/* Dik telefonda kunye tam ekran acilinca arayuz cekilir */}
          {!(useCorridor && focused) && (
            <Hud
              audioOn={audioOn}
              onToggleAudio={() => setAudio(!audioOn)}
              onOpenTicket={() => setGateShown(true)}
              visitorCount={useCorridor ? Math.max(2, visitorCount) : visitorCount}
              hint={hint}
            />
          )}
        </>
      )}

      {preloadItems.length > 0 && <Preload items={preloadItems} />}

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
