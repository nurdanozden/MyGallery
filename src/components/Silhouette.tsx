type Props = {
  variant: number
  className?: string
}

/**
 * Ziyaretçi silueti — 172 birim (≈1.72 m) boyunda, 7.5 baş oranında çizilmiş
 * sade bir insan figürü.
 *
 * Anatomik hatlar (viewBox 0 0 64 172):
 *   baş 2–25 · boyun 25–32 · omuz 36 · bel 68 · kalça 88 · diz 130 · ayak 172
 *
 * Baş ayrı bir grupta durur ki esere bakarken yukarı kaldırılabilsin; bacaklar
 * kalçadan (32, 88), kollar omuzdan döner. Ayaklar öne bakar, `scaleX` ile
 * aynalandığında figür karşı yöne yürür.
 */
export function Silhouette({ variant, className }: Props) {
  const v = variant % 5

  const torso = TORSOS[v] ?? TORSOS[0]

  return (
    <svg
      className={className}
      viewBox="0 0 64 172"
      width="64"
      height="172"
      aria-hidden="true"
      focusable="false"
    >
      <g className="v-body">
        <g className="v-legs">
          <g className="v-leg v-leg-a">
            <path d={LEG_BACK} />
          </g>
          <g className="v-leg v-leg-b">
            <path d={LEG_FRONT} />
          </g>
        </g>

        <path className="v-torso" d={torso} />

        <g className="v-arms">
          <path className="v-arm v-arm-a" d={ARM_LEFT} />
          <path className="v-arm v-arm-b" d={ARM_RIGHT} />
        </g>

        {v === 3 && (
          <>
            <path className="v-strap" d="M24.2 30.6 50.8 62.4l-3 1.6L21.2 32z" />
            <path
              className="v-bag"
              d="M47.2 61.6h10a2.6 2.6 0 0 1 2.6 2.6v18.2a2.6 2.6 0 0 1-2.6 2.6h-10z"
            />
          </>
        )}
        {v === 4 && <path className="v-scarf" d="M24.6 29.8h14.8l1.8 9.4H22.8z" />}

        <path className="v-neck" d="M28.3 19h7.4l.7 14h-8.8z" />

        <g className="v-head">
          <ellipse cx="32" cy="13.8" rx="8.8" ry="11.6" />
          {v === 2 && (
            <path
              className="v-hair"
              d="M32 1.4c6.2 0 10.3 4.4 10.6 10.6.2 4.4-.6 9.4-2 14.6-.5 1.7-2.4 1.5-2.4-.3.1-4.2-.4-8.2-1.3-10.6-3.6 1-6.2 1-9.8 0-.9 2.4-1.4 6.4-1.3 10.6 0 1.8-1.9 2-2.4.3-1.4-5.2-2.2-10.2-2-14.6C21.7 5.8 25.8 1.4 32 1.4z"
            />
          )}
          {v === 4 && (
            <path
              className="v-hair"
              d="M22.6 12.2C23 5.6 27 2 32 2s9 3.6 9.4 10.2c-2.4-3.6-5.6-5.2-9.4-5.2s-7 1.6-9.4 5.2z"
            />
          )}
          {v === 1 && (
            <path
              className="v-hair"
              d="M40.6 6.2a4.6 4.6 0 1 1-6.4 6.4c-1.6-1.6-1.4-4.4.4-6.2s4.4-1.8 6 -.2z"
            />
          )}
        </g>
      </g>
    </svg>
  )
}

/* --- Gövde tipleri: eğimli omuz, hafif belden daralma --- */
const TORSOS = [
  // 0 · düz gövde, kalçada biter
  `M28.6 28c-4.6.6-8.2 2.6-10.6 6.2-1.8 2.8-2.8 6.4-3.1 11.4L14.6 56c-.2 4.6.8 8.6 2.2 12.4-1.2 5.2-1.6 10.2-1.2 15.2L16.6 93h30.8l1-9.4c.4-5 0-10-1.2-15.2 1.4-3.8 2.4-7.8 2.2-12.4l-.3-10.4c-.3-5-1.3-8.6-3.1-11.4-2.4-3.6-6-5.6-10.6-6.2z`,
  // 1 · palto, dize kadar iner
  `M28.6 28c-5 .6-8.8 2.8-11.2 6.6-1.8 2.8-2.8 6.6-3 11.8l-1 23.6c-.8 14-1.2 28-1 41l-.4 13h40l-.4-13c.2-13-.2-27-1-41l-1-23.6c-.2-5.2-1.2-9-3-11.8-2.4-3.8-6.2-6-11.2-6.6z`,
  // 2 · elbise, belden aşağı A hattı
  `M28.6 28c-4.6.6-8.2 2.6-10.6 6.2-1.8 2.8-2.8 6.4-3.1 11.4L14.7 60 9.8 110c-.4 4.4 1 6.6 4.2 6.6h36c3.2 0 4.6-2.2 4.2-6.6L49.3 60l-.2-14.4c-.3-5-1.3-8.6-3.1-11.4-2.4-3.6-6-5.6-10.6-6.2z`,
  // 3 · ceket, kalçanın biraz altında biter
  `M28.6 28c-5.2.6-9.2 2.8-11.6 6.8-1.8 2.8-2.8 6.6-3 11.8L13.8 60c-.2 12 .6 24 2.2 36l.6 4h30.8l.6-4c1.6-12 2.4-24 2.2-36l-.2-13.4c-.2-5.2-1.2-9-3-11.8-2.4-4-6.4-6.2-11.6-6.8z`,
  // 4 · uzun hırka, dar ve boyu uzun
  `M28.6 28c-4.2.6-7.6 2.6-9.8 6-1.6 2.6-2.5 6.2-2.7 11l-.5 21 .3 22-.7 16h33.6l-.7-16 .3-22-.5-21c-.2-4.8-1.1-8.4-2.7-11-2.2-3.4-5.6-5.4-9.8-6z`,
]

/* --- Bacaklar: kalçadan tabana, ayak öne bakar --- */
const LEG_BACK =
  'M17.5 80h14l-.7 50-.6 31 8.5 6.6c1.6.8 2.4 1.6 2.4 2.6 0 1.1-.9 1.8-2.6 1.8H23.6c-1.8 0-2.6-1-2.4-2.8l1.2-8.2-1.9-31z'

const LEG_FRONT =
  'M32.5 80h14l-.7 50-.6 31 8.5 6.6c1.6.8 2.4 1.6 2.4 2.6 0 1.1-.9 1.8-2.6 1.8H38.6c-1.8 0-2.6-1-2.4-2.8l1.2-8.2-1.9-31z'

/* --- Kollar: omuzdan bileğe, gövdenin kenarını yalayarak iner --- */
const ARM_LEFT =
  'M16.2 34.4c-3 .9-4.6 3.6-4.5 7.6l.9 41.4c.1 3.5 1.6 5.4 3.8 5.4s3.7-1.9 3.8-5.4l.9-41.4c.1-4-1.7-6.7-4.9-7.6z'

const ARM_RIGHT =
  'M47.8 34.4c3 .9 4.6 3.6 4.5 7.6l-.9 41.4c-.1 3.5-1.6 5.4-3.8 5.4s-3.7-1.9-3.8-5.4l-.9-41.4c-.1-4 1.7-6.7 4.9-7.6z'
