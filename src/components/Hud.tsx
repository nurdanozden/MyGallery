type Props = {
  audioOn: boolean
  onToggleAudio: () => void
  onOpenTicket: () => void
  visitorCount: number
  hint: string | null
}

export function Hud({ audioOn, onToggleAudio, onOpenTicket, visitorCount, hint }: Props) {
  return (
    <div className="hud">
      <button type="button" className="hud-btn hud-curator" onClick={onOpenTicket}>
        <span className="hud-dot" aria-hidden="true" />
        Küratör / Giriş
      </button>

      <button
        type="button"
        className={`hud-btn hud-audio${audioOn ? ' is-on' : ''}`}
        onClick={onToggleAudio}
        aria-pressed={audioOn}
        aria-label={audioOn ? 'Sergi ambiyansını kapat' : 'Sergi ambiyansını aç'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4z" />
          {audioOn ? (
            <>
              <path className="wave w1" d="M15.4 9.2a4 4 0 0 1 0 5.6" />
              <path className="wave w2" d="M17.9 6.7a7.6 7.6 0 0 1 0 10.6" />
            </>
          ) : (
            <path className="mute" d="M16 9.5l5 5m0-5l-5 5" />
          )}
        </svg>
        <span className="hud-audio-label">{audioOn ? 'Ambiyans açık' : 'Sessiz'}</span>
      </button>

      {hint && <p className="hud-hint">{hint}</p>}

      <div className="hud-visitors" aria-live="polite">
        <span className="hud-pulse" aria-hidden="true" />
        {visitorCount} Ziyaretçi Salonda
      </div>
    </div>
  )
}
