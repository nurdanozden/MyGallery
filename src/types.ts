export type WallId = 'back' | 'left' | 'right'

export type Photo = {
  /** Dosya adı: src/assets/photos/ içine bu isimle bir görsel bırakınca otomatik yüklenir. */
  file: string
  title: string
  place: string
  year: number
  /** Kadrajın arkasındaki kısa hikâye. */
  story: string
  exif: {
    lens: string
    aperture: string
    shutter: string
    iso: string
  }
  orientation: 'landscape' | 'portrait' | 'square'
  /** Yer tutucu görsel üretimi için renk tohumu. */
  tint: [string, string, string]
}

export type FramePlacement = {
  photo: Photo
  index: number
  wall: WallId
  /** Duvar düzlemi içindeki yatay konum (px). */
  u: number
  /** Duvar düzlemi içindeki dikey konum, tavandan aşağı (px). */
  v: number
  w: number
  h: number
  /** Dünya koordinatlarında çerçeve merkezi. */
  world: { x: number; y: number; z: number }
  /** Ziyaretçilerin bu esere bakmak için durduğu zemin noktası. */
  standing: { x: number; z: number }
  /** Odak modunda kameranın alması gereken yatay açı. */
  faceY: number
}
