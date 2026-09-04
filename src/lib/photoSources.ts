import type { Photo } from '../types'

const modules = import.meta.glob('../assets/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()
  if (name) byName.set(name.toLowerCase(), url)
}

/** Basit, tohumlanmış sözde-rastgele üreteç: yer tutucular her yüklemede aynı kalsın diye. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Gerçek fotoğraf yokken duvarın boş kalmaması için, esere ait renk tohumundan
 * atmosferik bir "yer tutucu baskı" üretir.
 */
function placeholder(photo: Photo, w: number, h: number) {
  const r = seeded(hash(photo.file))
  const [deep, mid, light] = photo.tint
  const horizon = 0.42 + r() * 0.24
  const sunX = 0.2 + r() * 0.6
  const sunY = horizon - 0.06 - r() * 0.14

  const hills = Array.from({ length: 3 }, (_, i) => {
    const base = horizon + 0.02 + i * 0.05
    const amp = 0.05 - i * 0.012
    const pts: string[] = []
    for (let x = 0; x <= 10; x++) {
      const t = x / 10
      const y = base - Math.sin(t * (2 + i) * Math.PI + r() * 3) * amp
      pts.push(`${(t * w).toFixed(1)},${(y * h).toFixed(1)}`)
    }
    const op = (0.55 - i * 0.13).toFixed(2)
    return `<polygon points="0,${h} ${pts.join(' ')} ${w},${h}" fill="${deep}" opacity="${op}"/>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${deep}"/><stop offset="${horizon.toFixed(2)}" stop-color="${mid}"/><stop offset="1" stop-color="${light}"/>
</linearGradient>
<radialGradient id="sun" cx="${sunX.toFixed(2)}" cy="${sunY.toFixed(2)}" r="0.55">
<stop offset="0" stop-color="${light}" stop-opacity="0.95"/><stop offset="1" stop-color="${light}" stop-opacity="0"/>
</radialGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${hash(photo.title) % 90}"/><feColorMatrix type="saturate" values="0"/></filter>
<linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#000" stop-opacity="0.34"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/>
</linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
<rect width="${w}" height="${h}" fill="url(#sun)"/>
${hills}
<rect width="${w}" height="${h}" fill="url(#vig)"/>
<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.13"/>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function resolvePhoto(photo: Photo): { src: string; isPlaceholder: boolean } {
  const found = byName.get(photo.file.toLowerCase())
  if (found) return { src: found, isPlaceholder: false }
  const dims =
    photo.orientation === 'portrait'
      ? { w: 800, h: 1200 }
      : photo.orientation === 'square'
        ? { w: 1000, h: 1000 }
        : { w: 1200, h: 800 }
  return { src: placeholder(photo, dims.w, dims.h), isPlaceholder: true }
}

export const hasRealPhotos = byName.size > 0
