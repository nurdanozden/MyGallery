import type { Photo } from '../types'
import { PhotoImg } from './PhotoImg'

type Item = { photo: Photo; sizes: string }

/**
 * Ziyaretci bileti koparirken duvarin ilk eserleri sessizce iniyor.
 *
 * Bunlar gercek `<picture>` elemanlari - `<link rel=preload>` degil: AVIF/WebP
 * secimini ve srcset'ten hangi boyun inecegini tarayici duvardakiyle BIREBIR
 * ayni kurallarla yapsin diye. Salona girildiginde ayni istek bellekten karsilanir,
 * cerceveler bos beklemez.
 *
 * `sizes` bu yuzden disaridan geliyor: masaustunde eserin duvardaki piksel
 * genisligi, mobilde koridor kartinin genisligi.
 */
export function Preload({ items }: { items: Item[] }) {
  return (
    <div className="preload" aria-hidden="true">
      {items.map(({ photo, sizes }) => (
        <PhotoImg key={photo.slug} photo={photo} alt="" ariaHidden sizes={sizes} eager />
      ))}
    </div>
  )
}
