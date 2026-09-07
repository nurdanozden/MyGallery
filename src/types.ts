export type WallId = 'back' | 'left' | 'right'

export type Orientation = 'landscape' | 'portrait' | 'square'

/** `npm run photos` ile uretilen tek bir boy. Dosya adlari public/photos/ altinda. */
export type PhotoVariant = {
  w: number
  h: number
  webp: string
  avif?: string
}

/**
 * Fotograf hattinin cikardigi ham kayit — photoManifest.ts icinde durur,
 * elle duzenlenmez.
 */
export type PhotoAsset = {
  slug: string
  /** photos-original/ icindeki orijinal dosya adi. */
  file: string
  /** Dosya adindan turetilen baslik; photoMeta.ts'teki baslik bunu ezer. */
  autoTitle: string
  /** EXIF cekim yili (yoksa dosya tarihi). */
  year: number
  orientation: Orientation
  /** Orijinalin gercek piksel olculeri; en-boy orani buradan. */
  width: number
  height: number
  exif: PhotoExif
  /** Karenin uc ana rengi, koyudan aciga. */
  tint: [string, string, string]
  /** 24px'lik bulanik on izleme (data URI) — gorsel inene kadar duvarda o durur. */
  lqip: string
  /** Kucukten buyuge uretilmis boylar. */
  variants: PhotoVariant[]
}

export type PhotoExif = {
  lens: string
  aperture: string
  shutter: string
  iso: string
}

/** Elle yazilan kunye; bos birakilan alanlar otomatik degere duser. */
export type PhotoMeta = {
  title?: string
  place?: string
  year?: number
  /** Kadrajin arkasindaki kisa hikaye. Bos ise kunyede hic gosterilmez. */
  story?: string
}

/** Manifest + kunye birlesince duvara asilan eser. */
export type Photo = {
  slug: string
  file: string
  title: string
  place: string
  year: number
  story: string
  exif: PhotoExif
  orientation: Orientation
  width: number
  height: number
  lqip: string
  variants: PhotoVariant[]
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
