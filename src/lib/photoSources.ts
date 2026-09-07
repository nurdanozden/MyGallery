import type { Photo, PhotoVariant } from '../types'

/** `public/photos/` alt yolu; alt dizine deploy edilse de doğru kalsın diye BASE_URL'den. */
const BASE = `${import.meta.env.BASE_URL}photos/`

const isData = (name: string) => name.startsWith('data:')
const url = (name: string) => (isData(name) ? name : BASE + name)

const longEdge = (v: PhotoVariant) => Math.max(v.w, v.h)

/** Yedek `src` bu boya en yakın kopyayı seçer. */
const FALLBACK_EDGE = 800

export type PhotoSrc = {
  /** srcset olmayan tarayıcılar ve `<img src>` için orta boy. */
  src: string
  webp: string
  avif: string | null
}

/**
 * `<img srcset>` için genişlik tanımlayıcılı liste. Tarayıcı `sizes` ile
 * birlikte hangi boyu indireceğine kendi karar verir; biz üst sınırı koyarız.
 */
export function photoSrc(photo: Photo): PhotoSrc {
  const vs = photo.variants

  // Demo modda "boy" diye bir sey yok: yer tutucu, icinde virgul gecen bir
  // data URI. srcset virgulle ayrildigi icin orada listeye hic girmemeli.
  if (isData(vs[0].webp)) return { src: vs[0].webp, webp: '', avif: null }

  const webp = vs.map((v) => `${url(v.webp)} ${v.w}w`).join(', ')
  const avifs = vs.filter((v) => v.avif)
  const avif = avifs.length ? avifs.map((v) => `${url(v.avif!)} ${v.w}w`).join(', ') : null

  // Yedek `src`: orta boy — srcset'i anlamayan tarayıcı da makul bir dosya
  // indirsin, en büyüğünü değil.
  let pick = vs[0]
  for (const v of vs) {
    if (Math.abs(longEdge(v) - FALLBACK_EDGE) < Math.abs(longEdge(pick) - FALLBACK_EDGE)) pick = v
  }

  return { src: url(pick.webp), webp, avif }
}

/** Odak modunda komşu eserleri sessizce önden indir. */
export function prefetch(photo: Photo) {
  if (typeof Image === 'undefined') return
  const { src } = photoSrc(photo)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}
