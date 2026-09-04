type Props = {
  variant: number
  className?: string
}

/**
 * Sade, detaysız insan silueti (yaklaşık 1.72 m). Baş ayrı bir grupta durur ki
 * esere bakarken yukarı kaldırılabilsin, düşünürken yana eğilebilsin; bacaklar
 * kalçadan döner, böylece yürüyüş adım adım okunur.
 */
export function Silhouette({ variant, className }: Props) {
  const v = variant % 5

  // Gövde tipleri: düz, palto, elbise, ceket, uzun hırka.
  const torso =
    v === 1
      ? 'M32 33c-8.6 0-14 4.6-14.8 11.4L14 92c-.5 4.4 1.4 6.6 4.6 6.6h26.8c3.2 0 5.1-2.2 4.6-6.6l-3.2-47.6C46 37.6 40.6 33 32 33z'
      : v === 2
        ? 'M32 33c-8 0-13.4 4.4-14.2 10.8L12.6 94c-.6 4.2 1.2 6.4 4.4 6.4h30c3.2 0 5-2.2 4.4-6.4l-5.2-50.2C45.4 37.4 40 33 32 33z'
        : v === 4
          ? 'M32 33c-8.2 0-13.6 4.4-14.2 11l-1.4 48c-.2 4.2 1.6 6.4 4.6 6.4h22c3 0 4.8-2.2 4.6-6.4l-1.4-48C45.6 37.4 40.2 33 32 33z'
          : 'M32 33c-7.8 0-13 4.6-13.4 11.2l-1.2 45c-.1 4.2 1.6 6.4 4.4 6.4h20.4c2.8 0 4.5-2.2 4.4-6.4l-1.2-45C45 37.6 39.8 33 32 33z'

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
            <path d="M24.8 90h6.4v76.4a3.2 3.2 0 0 1-6.4 0z" />
          </g>
          <g className="v-leg v-leg-b">
            <path d="M32.8 90h6.4v76.4a3.2 3.2 0 0 1-6.4 0z" />
          </g>
        </g>

        <path className="v-torso" d={torso} />

        <g className="v-arms">
          <path
            className="v-arm v-arm-a"
            d="M18.4 38c-2.5.5-4 2.7-4.1 6l.5 40c.1 2.5 1.5 4 3.6 4s3.5-1.5 3.6-4l.5-40c.1-3.3-1.6-5.5-4.1-6z"
          />
          <path
            className="v-arm v-arm-b"
            d="M45.6 38c-2.5.5-4.2 2.7-4.1 6l.5 40c.1 2.5 1.5 4 3.6 4s3.5-1.5 3.6-4l.5-40c-.1-3.3-1.6-5.5-4.1-6z"
          />
        </g>

        {v === 3 && <path className="v-bag" d="M44 56h9.4a1.8 1.8 0 0 1 1.8 1.8v14a1.8 1.8 0 0 1-1.8 1.8H44z" />}

        <g className="v-head">
          <path className="v-neck" d="M29.2 24h5.6v10h-5.6z" />
          <circle cx="32" cy="17" r="9.4" />
          {v === 2 && <path className="v-hair" d="M22.9 19.6a9.4 9.4 0 0 1 18.2 0c1.6 3.4 1.4 9-.6 9.4-1.2.2-1.4-5-2.4-7.4-2.6.6-9.6.6-12.2 0-1 2.4-1.2 7.6-2.4 7.4-2-.4-2.2-6-.6-9.4z" />}
          {v === 4 && <path className="v-hair" d="M23.4 15.6c.6-5 4.4-8 8.6-8s8 3 8.6 8c-3-2.6-6-3.4-8.6-3.4s-5.6.8-8.6 3.4z" />}
        </g>
      </g>
    </svg>
  )
}
