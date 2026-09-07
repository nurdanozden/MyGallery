/**
 * SERGİ KÜNYESİ
 * Buradaki metinleri kendine göre değiştir; giriş bileti ve arayüz buradan beslenir.
 */
export const exhibition = {
  title: 'MyGallery',
  subtitle: 'SOLO EXHIBITION',

  curator: {
    name: 'Nurdan Özden',
    role: 'Bilgisayar Mühendisi & Fotoğrafçı',
  },

  manifesto: [
    'Sosyal medyanın hızından uzakta, çektiğim kareleri kendi kurduğum bu dijital alanda bir araya getirmek istedim.',
    'İçeride aceleniz yok, keyifli gezmeler.',
  ],

  collection: {
    label: 'Koleksiyon',
    selectionYear: 2025,
    exhibitionNo: 'No. 001',
    edition: 'Birinci Seçki',
  },

  dates: {
    opening: '12.09.2025',
    closing: 'Süresiz',
  },

  ticket: {
    cta: 'Sergiye Giriş Yap',
    ctaEn: 'ENTER GALLERY',
    stamp: 'ADMIT ONE',
    serial: 'MG-2025-0001',
    hall: 'Salon A',
  },
} as const
