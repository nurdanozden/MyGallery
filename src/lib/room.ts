import type { FramePlacement, Photo, WallId } from '../types'

/**
 * Sahne birimleri ~ santimetre. Tavan 4m; `HALL` zemin, tavan ve yan duvarlarin
 * kameranin dibine kadar uzandigi derinlik - kadrajin alt ve ust ucunda bosluk
 * kalmasin diye salon gozun altina kadar surer.
 */
export const ROOM = {
  /** Ana duvarin en az genisligi; koleksiyon buyurse duvar uzar. */
  MIN_W: 1900,
  H: 370,
  HALL: 820,
} as const

/**
 * Tasarim tuvali. Olcek yalnizca YUKSEKLIKTEN turetilir: boylece duvar ve
 * cerceve hatti her ekranda ayni dikey oranda durur, genis ekranlar da
 * duvarin daha genis bir bolumunu gorur.
 */
export const DESIGN = { w: 780, h: 490 } as const

export const PERSPECTIVE = 1050

/** Kırmızı halının duvardan uzaklığı ve derinliği (zemin düzleminde, cm). */
export const CARPET = { from: 205, depth: 250 } as const

/** Eserlerin merkez yüksekliği; kamera da tam bu hizaya bakar. */
export const HANG_HEIGHT = 185
/** Ziyaretçilerin esere bakarken durduğu temel mesafe. */
const VIEW_DISTANCE = 250

/**
 * Her baski KENDI en-boy oraninda cerceveleniyor - gercek bir galeride oldugu
 * gibi. Sabit kaliplara sigdirmak kadraji kirpardi; koleksiyonun buyuk bolumu
 * 9:16 ve 16:9 oldugu icin bu her karede ~%16 kayip demekti.
 *
 * Cerceveler oran olarak farkli ama ALAN olarak esit: dikey ve yatay kareler
 * duvarda ayni gorsel agirlikta durur, hicbiri otekini ezmez.
 */
const PRINT_AREA = 126 * 188
/** Tavana ve zemine carpmasin, komsusunu bogmasin diye ust sinirlar. */
const MAX_INNER_H = 236
const MAX_INNER_W = 270
/** Paspartu: baskiyi cerceveden ayiran beyaz kenar. */
const MAT = 12
const MOULDING = 6

export function frameSize(photo: Pick<Photo, 'width' | 'height'>) {
  const ratio = photo.width / photo.height
  let w = Math.sqrt(PRINT_AREA * ratio)
  let h = Math.sqrt(PRINT_AREA / ratio)
  if (h > MAX_INNER_H) {
    h = MAX_INNER_H
    w = h * ratio
  }
  if (w > MAX_INNER_W) {
    w = MAX_INNER_W
    h = w / ratio
  }
  const inner = { w: Math.round(w), h: Math.round(h) }
  const pad = 2 * (MAT + MOULDING)
  return { inner, w: inner.w + pad, h: inner.h + pad, mat: MAT, moulding: MOULDING }
}

/** Eserler arasindaki bosluk ve duvarin iki ucundaki nefes payi. */
const GAP = 118
const MARGIN = 300

export type Layout = {
  frames: FramePlacement[]
  /** Koleksiyona gore uzayan ana duvarin genisligi. */
  width: number
}

/**
 * Butun eserler ana duvarda, muze duzeninde tek sirada ve merkezleri ayni
 * yukseklikte asiliyor. Duvar koleksiyon buyudukce uzuyor; ziyaretci de
 * gercek bir salondaki gibi duvar boyunca yatay olarak geziniyor.
 */
export function layoutFrames(photos: Photo[]): Layout {
  const sizes = photos.map((p) => frameSize(p))
  const run =
    sizes.reduce((sum, s) => sum + s.w, 0) + GAP * Math.max(0, photos.length - 1)
  const width = Math.max(ROOM.MIN_W, run + MARGIN * 2)

  let cursor = (width - run) / 2
  const frames = photos.map((photo, index) => {
    const size = sizes[index]
    const u = cursor + size.w / 2
    cursor += size.w + GAP

    return {
      photo,
      index,
      wall: 'back' as WallId,
      u,
      v: ROOM.H - HANG_HEIGHT,
      w: size.w,
      h: size.h,
      world: { x: u - width / 2, y: -HANG_HEIGHT, z: 0 },
      standing: { x: u - width / 2, z: VIEW_DISTANCE },
      faceY: 0,
    }
  })

  return { frames, width }
}

export type Camera = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  /** Bakış noktasının gözden uzaklığı; negatif değer kameranın yaklaşması demek. */
  dist: number
}

/**
 * Genel plan: salonun icine birkac adim girmis, eser hizasindan biraz yukaridan
 * bakan bir goz. Yakin durdugumuz icin zemin ve tavan kadrajin alt/ust ucunu
 * dolduruyor, arka duvar da genisligin buyuk bolumunu kapliyor.
 */
export const WIDE_CAMERA: Camera = {
  x: 0,
  // Bakis noktasi tam cerceve hizasinda: eser hatti ekranin dikey merkezine oturur.
  y: -HANG_HEIGHT,
  z: 260,
  // Negatif açı dünyayı öne yatırır: göz eser hizasının biraz üstünden bakar,
  // böylece zemin ve halı kadrajın alt ucunu doldurur.
  rx: -7,
  ry: 0,
  dist: -10,
}

/** Bir esere tam karşıdan bakan kamera. */
export function focusCamera(f: FramePlacement): Camera {
  const fill = focusFill(f.h)
  const dist = PERSPECTIVE / fill - PERSPECTIVE
  return { x: f.world.x, y: f.world.y, z: f.world.z, rx: 0, ry: f.faceY, dist }
}

/** Genel planda arka duvarin gozden uzakligi. */
export const WALL_SCALE = PERSPECTIVE / (PERSPECTIVE + 260 - 10)

/**
 * Duvar ekrana sigmadiginda kameranin saga sola gidebilecegi mesafe.
 * Gorunur genislik ekranin gercek genisligine bagli oldugu icin disaridan verilir.
 */
export function panRange(width: number, viewportW: number, scale: number) {
  const visibleHalf = viewportW / 2 / (scale * WALL_SCALE)
  return Math.max(0, width / 2 - visibleHalf + 40)
}

/** Bir eserin duvar boyunca kacinci noktada durdugu (0..1) - ilerleme cubugu icin. */
export function panProgress(pan: number, limit: number) {
  return limit <= 0 ? 0.5 : (pan + limit) / (limit * 2)
}

/**
 * Kameranin o an gordugu duvar parcasi ve onun etrafindaki yukleme halkasi.
 * Duvar 100 eserle ~27 metre; ekranda hep birkac eser var. `near` gorunenler
 * (once inerler), `far` ise gezinme yonunde hazir bekleyenler. Bu halkanin
 * disindaki eserler hic DOM'a girmez.
 */
export function visibleRing(
  frames: FramePlacement[],
  camX: number,
  viewportW: number,
  scale: number,
) {
  const half = viewportW / 2 / (scale * WALL_SCALE)
  // Gezinme yonunde bir bucuk ekran dolusu hazir beklesin: pan sirasinda bos
  // cerceve gorunmesin, ama acilista da onlarca dosya birden inmesin.
  const pad = half * 1.2
  let near0 = frames.length
  let near1 = -1
  let far0 = frames.length
  let far1 = -1

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]
    const l = f.world.x - f.w / 2
    const r = f.world.x + f.w / 2
    if (r >= camX - half && l <= camX + half) {
      if (i < near0) near0 = i
      if (i > near1) near1 = i
    }
    if (r >= camX - half - pad && l <= camX + half + pad) {
      if (i < far0) far0 = i
      if (i > far1) far1 = i
    }
  }
  // Duvarin tamami ekrana sigiyorsa halka bos kalmasin.
  if (far1 < far0) {
    far0 = 0
    far1 = frames.length - 1
  }
  return { near0, near1, far0, far1 }
}

export type Ring = ReturnType<typeof visibleRing>

/** Odak modunda esere yaklasan kameranin buyutme carpani. */
export function focusFill(h: number) {
  return (DESIGN.h * 0.62) / h
}

export function cameraTransform(c: Camera) {
  return [
    `translate3d(0, 0, ${-c.dist}px)`,
    `rotateX(${c.rx}deg)`,
    `rotateY(${c.ry}deg)`,
    `translate3d(${-c.x}px, ${-c.y}px, ${-c.z}px)`,
  ].join(' ')
}

/* --------------------------------------------------------------------------
   YUZEY PENCERESI

   Duvar 95 eserde ~28.000px uzuyor. Zemin, tavan, arka duvar ve hali bu
   genislikte BOYALI birer katmandi: tarayici salona girildigi anda ekranin
   ~30 katı buyuklugunde yuzeyler rasterlemek zorunda kaliyordu. Halinin ve
   zeminin gec belirmesinin sebebi buydu - indirilen bir dosya degil, cizilen
   bir yuzey.

   Cozum: bu dort yuzey artik kameranin etrafinda birkac ekran genisliginde
   kayan bir PENCERE. Dokularin yatay periyodu SURFACE_STEP'i boldugu icin
   pencere bu adima yaslanarak kaydiginda desen salona cakili durur; goz
   hicbir kayma gormez. Eserler, isik havuzlari ve yansimalar ise pencerenin
   icinde duvar koordinatinda duran seffaf bir katmanda kalir.
   -------------------------------------------------------------------------- */

/** Zemin/hali/gurultu dokularinin ortak yatay periyodu. Pencere bu adimla kayar. */
export const SURFACE_STEP = 160

/** Pencerenin genisligi: bir ekran dolusu duvar + iki yanda birer adim pay. */
export function surfaceSpan(viewportW: number, scale: number) {
  const visible = viewportW / (scale * WALL_SCALE)
  const raw = visible * 1.25 + SURFACE_STEP * 2
  return Math.ceil(raw / SURFACE_STEP) * SURFACE_STEP
}

/** Pencerenin dunya koordinatindaki sol kenari; adima yaslanir, salonu asmaz. */
export function surfaceLeft(camX: number, span: number, hallWidth: number) {
  const half = hallWidth / 2
  if (span >= hallWidth) return -half
  const lo = Math.floor(-half / SURFACE_STEP) * SURFACE_STEP
  const hi = Math.ceil((half - span) / SURFACE_STEP) * SURFACE_STEP
  const raw = Math.round((camX - span / 2) / SURFACE_STEP) * SURFACE_STEP
  return Math.max(lo, Math.min(hi, raw))
}
