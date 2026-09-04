# MyGallery — Dijital Solo Fotoğraf Sergisi

Ziyaretçi önce bir **sergi giriş bileti** ile karşılanır; bileti koparınca ışıklar
sırayla yanar ve karanlık bir galeri salonuna girer. Duvarda spot ışıkları altında
asılı eserler, zeminde ağırbaşlı adımlarla dolaşan minik siluetler vardır. Bir esere
tıklandığında kamera onun tam karşısına süzülür, salon kararır ve duvara monte pirinç
künye (eser adı, hikâye, EXIF) belirir.

## Çalıştırma

```bash
cd mygallery
npm install
npm run dev      # http://localhost:5173
npm run build    # üretim derlemesi -> dist/
```

## Kendi sergini kurma

### 1. Fotoğrafları ekle
Görselleri `src/assets/photos/` klasörüne bırak. Sonra `src/content/photos.ts`
içindeki her kaydın `file` alanını o dosyanın adıyla eşleştir:

```ts
{
  file: 'sessizligin-esigi.jpg',   // src/assets/photos/sessizligin-esigi.jpg
  title: 'Sessizliğin Eşiği',
  place: 'Bozcaada',
  year: 2025,
  story: 'Kadrajın arkasındaki 1-2 cümlelik hikâye.',
  exif: { lens: '50mm', aperture: 'f/1.8', shutter: '1/200s', iso: 'ISO 100' },
  orientation: 'landscape',        // landscape | portrait | square
  tint: ['#1d2a35', '#4a6b7c', '#c9b79c'],
}
```

Dosya henüz yoksa yerine `tint` renklerinden üretilmiş atmosferik bir **yer tutucu
baskı** asılır; yani sergi hiçbir zaman boş duvarla açılmaz. Eser sayısı serbesttir —
duvar koleksiyona göre uzar, ziyaretçi de duvar boyunca gezinir.

### 2. Bilet ve künye metinleri
`src/content/exhibition.ts`: adın, unvanın, manifesto cümlelerin, sergi numarası,
tarihler ve buton metinleri. **Açılışta `curator.name` alanını kendi adınla değiştir.**

## Kontroller

| Etkileşim | Sonuç |
|---|---|
| Fareyi ekranın sağ/sol kenarına yaklaştır | Salonda duvar boyunca yürür |
| ← → (odak dışında) | Aynı şekilde salonda gezinir |
| Esere tıkla | Odak modu: kamera esere döner, künye açılır |
| ← → (odak modunda) | Önceki / sonraki esere geçer |
| ESC veya boşluğa tıkla | Genel plana döner |
| Sol üst · Küratör / Giriş | Bileti yeniden açar |
| Sağ üst · hoparlör | Sergi ambiyansını açar / kapatır |

Mobilde sahne yatay kaydırılabilir bir koridora dönüşür; esere dokununca tam ekran
sunum ve künye paneli açılır.

## Mimari

```
src/
  content/
    exhibition.ts     Bilet ve sergi künyesi metinleri
    photos.ts         Eser listesi (başlık, hikâye, EXIF)
  lib/
    room.ts           Salon geometrisi, asma düzeni, kamera hesapları
    photoSources.ts   Görsel çözümleme + yer tutucu baskı üretimi
    ambience.ts       WebAudio ile üretilen lofi sergi ambiyansı (dosyasız)
    useViewport.ts    Ölçek ve medya sorguları
  components/
    TicketGate.tsx    Aşama 1 — bilet, koparma animasyonu
    Gallery.tsx       Aşama 2/4 — 3B salon, kamera rig'i, odak modu
    Visitors.tsx      Aşama 3 — siluetlerin dolaşma döngüsü
    Silhouette.tsx    Ziyaretçi siluet çizimi
    Plaque.tsx        Aşama 4 — pirinç müze künyesi
    Hud.tsx           Aşama 5 — üst menü, ses, ziyaretçi sayacı
    MobileCorridor.tsx Aşama 6 — mobil koridor
```

Salon saf CSS 3B dönüşümleriyle kurulur (WebGL yok). Kamera her karede
`requestAnimationFrame` ile sürülür: odak değişimlerinde ease-in-out bir geçiş,
salonda gezinirken imlece yumuşakça yetişen serbest takip. Ziyaretçi siluetleri de
aynı kamera açılarını CSS değişkeni üzerinden okuyup her zaman kameraya döner.

`prefers-reduced-motion` açıksa yürüyüş ve kamera hareketleri sadeleşir.
