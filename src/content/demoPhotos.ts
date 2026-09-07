import { placeholder } from '../lib/placeholder'
import type { Orientation, Photo } from '../types'

/**
 * DEMO SEÇKİ
 * Yalnızca `photos-original/` boşken — yani `npm run photos` henüz
 * çalıştırılmamışken — duvara asılır. Gerçek fotoğraflar geldiği an
 * bu liste devre dışı kalır.
 */

type Seed = Omit<Photo, 'width' | 'height' | 'lqip' | 'variants' | 'slug'>

const DIMS: Record<Orientation, { w: number; h: number }> = {
  portrait: { w: 800, h: 1200 },
  landscape: { w: 1200, h: 800 },
  square: { w: 1000, h: 1000 },
}

const seeds: Seed[] = [
  {
    file: 'sessizligin-esigi.jpg',
    title: 'Sessizliğin Eşiği',
    place: 'Bozcaada',
    year: 2025,
    story:
      'Rüzgâr kesildiğinde deniz bir anlığına nefesini tuttu. Deklanşöre bastığımda duyduğum tek şey kendi kalp atışımdı.',
    exif: { lens: '50mm', aperture: 'f/1.8', shutter: '1/200s', iso: 'ISO 100' },
    orientation: 'landscape',
    tint: ['#1d2a35', '#4a6b7c', '#c9b79c'],
  },
  {
    file: 'gec-kalan-tren.jpg',
    title: 'Geç Kalan Tren',
    place: 'Haydarpaşa, İstanbul',
    year: 2024,
    story:
      'Peronda kimse kalmamıştı. Gitmeyen bir trenin gölgesi, gitmek isteyen herkesi anlatıyordu.',
    exif: { lens: '35mm', aperture: 'f/2.0', shutter: '1/125s', iso: 'ISO 400' },
    orientation: 'portrait',
    tint: ['#241c1a', '#6d4b3a', '#e0c9a6'],
  },
  {
    file: 'kirmizi-avlu.jpg',
    title: 'Kırmızı Avlu',
    place: 'Mardin',
    year: 2024,
    story:
      'Taşın üzerinde biriken sıcak, akşamüstü aniden renge dönüştü. Bir dakika sonra o kırmızı yoktu.',
    exif: { lens: '85mm', aperture: 'f/2.8', shutter: '1/320s', iso: 'ISO 200' },
    orientation: 'landscape',
    tint: ['#2b1416', '#8c3b2e', '#e8a978'],
  },
  {
    file: 'sabah-vardiyasi.jpg',
    title: 'Sabah Vardiyası',
    place: 'Karaköy, İstanbul',
    year: 2023,
    story:
      'Simitçinin buharı ile vapurun dumanı aynı karede buluştu. Şehir henüz uyanmamıştı, liman çoktan çalışıyordu.',
    exif: { lens: '24mm', aperture: 'f/4.0', shutter: '1/500s', iso: 'ISO 160' },
    orientation: 'landscape',
    tint: ['#171d24', '#3f5a66', '#b9c9cc'],
  },
  {
    file: 'yaylanin-sisi.jpg',
    title: 'Yaylanın Sisi',
    place: 'Ayder, Rize',
    year: 2025,
    story:
      'Sis on dakikada bütün vadiyi yuttu. Görmediğim bir manzarayı, sadece sesinden tanıyarak çektim.',
    exif: { lens: '70mm', aperture: 'f/5.6', shutter: '1/160s', iso: 'ISO 320' },
    orientation: 'portrait',
    tint: ['#1a2320', '#4e6b5c', '#cfd8cd'],
  },
  {
    file: 'gece-nobeti.jpg',
    title: 'Gece Nöbeti',
    place: 'Kadıköy, İstanbul',
    year: 2024,
    story:
      'Kapanmayan tek dükkânın ışığı, ıslak asfalta uzun bir cümle gibi düştü. Ben sadece noktasını koydum.',
    exif: { lens: '35mm', aperture: 'f/1.4', shutter: '1/60s', iso: 'ISO 1600' },
    orientation: 'square',
    tint: ['#12141c', '#3b3f63', '#e6b855'],
  },
  {
    file: 'tuzun-aynasi.jpg',
    title: 'Tuzun Aynası',
    place: 'Tuz Gölü, Konya',
    year: 2023,
    story:
      'Yer ile gök arasındaki çizgi kayboldu. Bir süre hangi tarafta yürüdüğümü bilemedim.',
    exif: { lens: '24mm', aperture: 'f/11', shutter: '1/250s', iso: 'ISO 100' },
    orientation: 'landscape',
    tint: ['#20242c', '#7f8ea1', '#f0ece2'],
  },
  {
    file: 'son-misafir.jpg',
    title: 'Son Misafir',
    place: 'Alaçatı, İzmir',
    year: 2025,
    story:
      'Sezon bitmiş, sandalyeler kaldırılmıştı. Kalan tek masa, gitmeyi unutan birini bekliyor gibiydi.',
    exif: { lens: '50mm', aperture: 'f/2.2', shutter: '1/400s', iso: 'ISO 100' },
    orientation: 'portrait',
    tint: ['#1c1a17', '#6f6350', '#dcc9a4'],
  },
]

export const demoPhotos: Photo[] = seeds.map((s) => {
  const { w, h } = DIMS[s.orientation]
  const art = placeholder(s.file, s.tint, w, h)
  return {
    ...s,
    slug: s.file.replace(/\.[^.]+$/, ''),
    width: w,
    height: h,
    lqip: art,
    variants: [{ w, h, webp: art }],
  }
})
