import { useCallback, useEffect, useMemo, useState } from 'react'
import { exhibition } from '../content/exhibition'
import { useMediaQuery } from '../lib/useViewport'

/** Koparma payı. Yan çevrilmiş telefonda kadraj 342px; orada daha dar olmalı. */
const STUB = 92
const STUB_SHORT = 62
const TEETH = 34

/** Biletin koparma hattını, iki yarıya da uyan testere dişi bir sınır olarak üretir. */
function tearClips(STUB: number) {
  const boundary = (i: number) => `calc(100% - ${STUB - (i % 2 === 0 ? 0 : 7)}px)`
  const forward: string[] = []
  for (let i = 0; i <= TEETH; i++) {
    forward.push(`${((i / TEETH) * 100).toFixed(2)}% ${boundary(i)}`)
  }
  const backward = [...forward].reverse()
  return {
    top: `polygon(0 0, 100% 0, ${backward.join(', ')}, 0 0)`,
    bottom: `polygon(${forward.join(', ')}, 100% 100%, 0 100%)`,
  }
}

const BARCODE = (() => {
  let s = 20250912
  return Array.from({ length: 46 }, () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return 1 + ((s >>> 8) % 4)
  })
})()

function Barcode() {
  const bars = BARCODE
  return (
    <div className="ticket-barcode" aria-hidden="true">
      {bars.map((w, i) => (
        <i key={i} style={{ width: `${w}px`, opacity: i % 3 === 0 ? 0.9 : 0.65 }} />
      ))}
    </div>
  )
}

type Props = {
  photoCount: number
  onEnter: () => void
  /** Sergi zaten gezilmişken künye tekrar açılıyorsa kapatılabilir olsun. */
  dismissible?: boolean
  onDismiss?: () => void
}

export function TicketGate({ photoCount, onEnter, dismissible, onDismiss }: Props) {
  const [torn, setTorn] = useState(false)
  const [closing, setClosing] = useState(false)
  const compact = useMediaQuery('(max-height: 560px) and (orientation: landscape)')
  const stub = compact ? STUB_SHORT : STUB
  const clips = useMemo(() => tearClips(stub), [stub])
  const { curator, collection, dates, ticket } = exhibition

  useEffect(() => {
    if (!torn) return
    const t = window.setTimeout(onEnter, 780)
    return () => window.clearTimeout(t)
  }, [torn, onEnter])

  const close = useCallback(() => {
    if (!onDismiss) return
    setClosing(true)
    window.setTimeout(onDismiss, 320)
  }, [onDismiss])

  useEffect(() => {
    if (!dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissible, close])

  const face = (
    <div className="ticket-face">
      <div className="ticket-main">
        <header className="ticket-head">
          <div>
            <p className="ticket-brand">{exhibition.title}</p>
            <p className="ticket-kicker">{exhibition.subtitle}</p>
          </div>
          <div className="ticket-stamp" aria-hidden="true">
            <span>{ticket.stamp}</span>
            <em>{collection.exhibitionNo}</em>
          </div>
        </header>

        <div className="ticket-rule" aria-hidden="true" />

        <section className="ticket-curator">
          <p className="ticket-label">Küratör &amp; Sanatçı</p>
          <p className="ticket-name">{curator.name}</p>
          <p className="ticket-role">{curator.role}</p>
        </section>

        <section className="ticket-manifesto">
          {exhibition.manifesto.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        <section className="ticket-meta">
          <div>
            <p className="ticket-label">Eser</p>
            <p className="ticket-value">{String(photoCount).padStart(2, '0')} kare</p>
          </div>
          <div>
            <p className="ticket-label">Seçki</p>
            <p className="ticket-value">{collection.selectionYear}</p>
          </div>
          <div>
            <p className="ticket-label">Sergi</p>
            <p className="ticket-value">{collection.exhibitionNo}</p>
          </div>
          <div>
            <p className="ticket-label">Salon</p>
            <p className="ticket-value">{ticket.hall}</p>
          </div>
        </section>

        <footer className="ticket-foot">
          <Barcode />
          <div className="ticket-dates">
            <span>{dates.opening}</span>
            <span aria-hidden="true">—</span>
            <span>{dates.closing}</span>
          </div>
        </footer>
      </div>

      <div className="ticket-stub">
        <span className="ticket-stub-serial">{ticket.serial}</span>
        <span className="ticket-stub-cta">
          {ticket.cta}
          <em>{ticket.ctaEn}</em>
        </span>
        <span className="ticket-stub-arrow" aria-hidden="true">
          →
        </span>
      </div>
    </div>
  )

  return (
    <div className={`gate${torn ? ' is-torn' : ''}${closing ? ' is-closing' : ''}`}>
      <div className="gate-glow" aria-hidden="true" />

      {dismissible && (
        <button type="button" className="gate-close" onClick={close}>
          Salona dön
        </button>
      )}

      <div className="ticket-wrap">
        <div className="ticket">
          <div className="ticket-half ticket-top" style={{ clipPath: clips.top }}>
            {face}
          </div>
          <div className="ticket-half ticket-bottom" style={{ clipPath: clips.bottom }}>
            {face}
          </div>
          <div className="ticket-perf" aria-hidden="true" />
          <div className="ticket-notch ticket-notch-l" aria-hidden="true" />
          <div className="ticket-notch ticket-notch-r" aria-hidden="true" />
          <button
            type="button"
            className="ticket-hit"
            style={{ height: `${stub}px` }}
            onClick={() => !torn && setTorn(true)}
            disabled={torn}
            autoFocus
            aria-label={`${ticket.cta} — ${ticket.ctaEn}`}
          />
        </div>
      </div>

      <p className="gate-hint">Bileti kopararak sergiye giriş yapın</p>
    </div>
  )
}
