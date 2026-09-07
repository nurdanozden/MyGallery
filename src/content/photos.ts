import type { Photo } from '../types'
import { demoPhotos } from './demoPhotos'
import { photoManifest } from './photoManifest'
import { photoMeta } from './photoMeta'

/**
 * ESERLER
 *
 * Duvara asılan liste iki kaynaktan birleşir:
 *   photoManifest.ts  — `npm run photos` üretir (boyutlar, EXIF, ön izleme)
 *   photoMeta.ts      — künyeyi sen yazarsın (ad, yer, hikâye)
 *
 * Künyede boş bırakılan her alan otomatik değerine düşer, böylece yeni bir
 * fotoğraf eklendiğinde hiçbir şey yazmadan da duvara doğru şekilde asılır.
 */
function merge(a: (typeof photoManifest)[number]): Photo {
  const m = photoMeta[a.slug] ?? {}
  return {
    slug: a.slug,
    file: a.file,
    title: m.title?.trim() || a.autoTitle,
    place: m.place?.trim() || '',
    year: m.year ?? a.year,
    story: m.story?.trim() || '',
    exif: a.exif,
    orientation: a.orientation,
    width: a.width,
    height: a.height,
    lqip: a.lqip,
    variants: a.variants,
    tint: a.tint,
  }
}

/**
 * ASMA SIRASI
 *
 * Yatay kareler azınlıkta (100 eserde 22) ve çekim tarihine göre sıralanınca
 * duvarın bir ucunda kümeleniyorlar. Burada onları dikeylerin arasına eşit
 * aralıklarla dağıtıyoruz: duvar boyunca yürüyen ziyaretçi sürekli aynı
 * kadraj oranını görmek yerine bir ritim yakalıyor.
 *
 * Her grubun **kendi içinde** kronolojik sırası korunur.
 */
function hangOrder(list: Photo[]): Photo[] {
  const wide = list.filter((p) => p.orientation === 'landscape')
  // Kare kadrajlar dikeye daha yakın durduğu için onlarla aynı akışta.
  const tall = list.filter((p) => p.orientation !== 'landscape')
  if (!wide.length || !tall.length) return list

  // Hangisi azınlıktaysa çoğunluğun arasına o serpiştirilir.
  const [few, many] = wide.length <= tall.length ? [wide, tall] : [tall, wide]
  const total = list.length
  const slots = new Set(few.map((_, i) => Math.round(((i + 0.5) * total) / few.length)))

  const out: Photo[] = []
  let f = 0
  let m = 0
  for (let i = 0; i < total; i++) {
    if (slots.has(i) && f < few.length) out.push(few[f++])
    else if (m < many.length) out.push(many[m++])
    else out.push(few[f++])
  }
  return out
}

export const photos: Photo[] = photoManifest.length
  ? hangOrder(photoManifest.map(merge))
  : demoPhotos

/** Gerçek fotoğraflar henüz `photos-original/` klasörüne konmamış. */
export const isDemo = photoManifest.length === 0
