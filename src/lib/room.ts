import type { FramePlacement, Photo, WallId } from '../types'

/**
 * Sahne birimleri ~ santimetre. Salon 16m genis, 4.6m yuksek.
 * `D` eserlerin asildigi bolumun derinligi; `HALL` ise zemin, tavan ve yan
 * duvarlarin kameranin altina kadar uzandigi toplam derinlik - boylece
 * kadrajin alt ve ust ucunda bosluk kalmiyor.
 */
export const ROOM = {
  /** Ana duvarin en az genisligi; koleksiyon buyurse duvar uzar. */
  MIN_W: 1900,
  H: 460,
  HALL: 980,
} as const

/** Tasarım tuvali; ekrana bu ölçek üzerinden oturtulur. */
export const DESIGN = { w: 1280, h: 820 } as const

export const PERSPECTIVE = 1050

/** Eserlerin merkez yüksekliği (zeminden 1.75m). */
const HANG_HEIGHT = 175
/** Ziyaretçilerin esere bakarken durduğu mesafe. */
const VIEW_DISTANCE = 340

const LONG_EDGE = 148
const SHORT_EDGE = 99
const MAT = 19
const MOULDING = 5

export function frameSize(o: Photo['orientation']) {
  const inner =
    o === 'landscape'
      ? { w: LONG_EDGE, h: SHORT_EDGE }
      : o === 'portrait'
        ? { w: SHORT_EDGE, h: LONG_EDGE }
        : { w: SHORT_EDGE + 14, h: SHORT_EDGE + 14 }
  const pad = 2 * (MAT + MOULDING)
  return { inner, w: inner.w + pad, h: inner.h + pad, mat: MAT, moulding: MOULDING }
}

/** Eserler arasindaki bosluk ve duvarin iki ucundaki nefes payi. */
const GAP = 150
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
  const sizes = photos.map((p) => frameSize(p.orientation))
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
  y: -198,
  z: 260,
  rx: 7,
  ry: 0,
  dist: -10,
}

/** Bir esere tam karşıdan bakan kamera. */
export function focusCamera(f: FramePlacement): Camera {
  const fill = (DESIGN.h * 0.52) / f.h
  const dist = PERSPECTIVE / fill - PERSPECTIVE
  return { x: f.world.x, y: f.world.y, z: f.world.z, rx: 0, ry: f.faceY, dist }
}

/** Genel planda arka duvarin gozden uzakligi. */
const WALL_SCALE = PERSPECTIVE / (PERSPECTIVE + 260 - 10)

/** Duvar ekrana sigmadiginda kameranin saga sola gidebilecegi mesafe. */
export function panRange(width: number) {
  const visibleHalf = DESIGN.w / 2 / WALL_SCALE
  return Math.max(0, width / 2 - visibleHalf - 40)
}

export function cameraTransform(c: Camera) {
  return [
    `translate3d(0, 0, ${-c.dist}px)`,
    `rotateX(${c.rx}deg)`,
    `rotateY(${c.ry}deg)`,
    `translate3d(${-c.x}px, ${-c.y}px, ${-c.z}px)`,
  ].join(' ')
}
