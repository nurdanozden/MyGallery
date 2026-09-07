import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Photo } from '../types'
import { photoSrc } from '../lib/photoSources'

type Props = {
  photo: Photo
  alt: string
  className?: string
  /**
   * Görselin ekranda kaplayacağı genişlik (`sizes` niteliği). Tarayıcı bunu
   * piksel yoğunluğuyla çarpıp srcset'ten doğru boyu seçer — yanlış verilirse
   * ya bulanık ya da gereksiz büyük dosya iner.
   */
  sizes: string
  /**
   * Salonun duvarı 3B dönüştürülmüş bir düzlem; tarayıcının `loading="lazy"`
   * görünürlük kestirimi orada güvenilir çalışmaz. Duvardaki eserler bu yüzden
   * eager iner, sıralamayı `priority` yapar. Mobil koridor normal bir kaydırma
   * olduğu için lazy'de kalır.
   */
  eager?: boolean
  /** Ekrandaki eserler önce insin diye indirme sırası. */
  priority?: 'high' | 'low'
  style?: CSSProperties
  ariaHidden?: boolean
}

/**
 * Duvardaki her baskı bu bileşenden geçer: altta 24px'lik bulanık ön izleme
 * (manifest'e gömülü, ayrı istek yok), üstünde tarayıcının srcset'ten seçtiği
 * gerçek dosya. Görsel inene kadar çerçeve boş kalmaz, bulanık baskı görünür.
 */
export function PhotoImg({
  photo,
  alt,
  className,
  sizes,
  eager = false,
  priority = 'low',
  style,
  ariaHidden,
}: Props) {
  const [ready, setReady] = useState(false)
  const { src, webp, avif } = useMemo(() => photoSrc(photo), [photo])

  return (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      <img
        className={className}
        alt={ariaHidden ? '' : alt}
        aria-hidden={ariaHidden || undefined}
        src={src}
        srcSet={webp || undefined}
        sizes={webp ? sizes : undefined}
        width={photo.width}
        height={photo.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={priority}
        decoding="async"
        draggable={false}
        onLoad={() => setReady(true)}
        style={{
          // Ön izleme arka planda bekler; gerçek kare indiğinde artık gerekmez.
          backgroundImage: ready ? undefined : `url("${photo.lqip}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          ...style,
        }}
      />
    </picture>
  )
}
