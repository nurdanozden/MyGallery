/**
 * SERGİ KÜNYESİ
 * Buradaki metinleri kendine göre değiştir; giriş bileti ve arayüz buradan beslenir.
 */
export const exhibition = {
  title: 'MyGallery',
  subtitle: 'SOLO EXHIBITION',

  curator: {
    name: 'Adınız Soyadınız',
    role: 'Bilgisayar Mühendisi & Fotoğrafçı',
  },

  manifesto: [
    'Gündüzleri kod yazıyorum, akşamları ışığın peşinden gidiyorum.',
    'Bu salonu, mühendislikte aradığım düzen ile fotoğrafta aradığım tesadüfü aynı odada buluşturmak için kurdum.',
    'İçeride acele yok; her kare, önünde durulacak kadar zaman istiyor.',
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
