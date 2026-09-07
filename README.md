# MyGallery — Dijital Solo Fotoğraf Sergisi

Ziyaretçi önce bir **sergi giriş bileti** ile karşılanır; bileti koparınca ışıklar
sırayla yanar ve karanlık bir galeri salonuna girer. Duvarda spot ışıkları altında
asılı eserler, cilalı parkeye serilmiş bordo kadife bir halı ve üzerinde ağırbaşlı
adımlarla dolaşan minik siluetler vardır — kimi ön planda tam boy ve net, kimi
duvara birkaç adım daha yakın, küçük ve puslu. Bir esere
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
Orijinal JPG'leri `mygallery/photos-original/` klasörüne bırak, sonra:

```bash
npm run photos
```

Bu komut her fotoğraftan üç boy (480 / 800 / 1280 px uzun kenar) AVIF + WebP
üretip `public/photos/` altına yazar, EXIF'ten diyafram · enstantane · ISO · odak
uzaklığı ve çekim tarihini okur, en-boy oranından `portrait / landscape / square`
kararını verir ve karenin üç ana rengini çıkarır. Kareler **çekim tarihine göre**
kronolojik asılır.

Orijinaller `.gitignore`'da — repoya ve siteye yalnızca optimize edilmiş kopyalar
girer. Değişmeyen fotoğraflar önbellekten geçer, yani yeni kare eklediğinde komutu
tekrar çalıştırmak saniyeler sürer (`--force` ile hepsi baştan üretilir).

### 1b. Künyeyi yaz
Başlık, yer ve hikâye `src/content/photoMeta.ts` içinde durur:

```ts
export const photoMeta: Record<string, PhotoMeta> = {
  'sessizligin-esigi': {
    title: 'Sessizliğin Eşiği',
    place: 'Bozcaada',
    story: 'Kadrajın arkasındaki 1-2 cümlelik hikâye.',
  },
}
```

`npm run photos` bu dosyayı **asla ezmez**; yalnızca yeni fotoğraflar için boş satır
açar. Boş bıraktığın alan otomatik değerine düşer (başlık = dosya adı, yıl = EXIF
çekim tarihi) ve boş bir hikâye künyede hiç gösterilmez — yani tek bir satır
yazmadan da sergi eksiksiz açılır, künyeleri zamanla doldurabilirsin.

`photos-original/` hâlâ boşsa demo seçki asılır: `tint` renklerinden üretilmiş
atmosferik yer tutucu baskılar. Sergi hiçbir zaman boş duvarla açılmaz.

Eser sayısı serbesttir — duvar koleksiyona göre uzar. 100 eserde duvar 320 metreyi
bulur; ziyaretçi salona duvarın **başından** girer ve boyunca yürür.

### 2. Bilet ve künye metinleri
`src/content/exhibition.ts`: adın, unvanın, manifesto cümlelerin, sergi numarası,
tarihler ve buton metinleri. **Açılışta `curator.name` alanını kendi adınla değiştir.**

## Kontroller

| Etkileşim | Sonuç |
|---|---|
| Fareyi ekranın sağ/sol kenarına yaklaştır | Salonda duvar boyunca yürür — kenara ne kadar yakınsa o kadar hızlı |
| Fare tekerleği / trackpad | Uzun duvarda hızlı yol alır |
| Kenarlardaki ‹ › okları | Bir sonraki çerçeve grubuna yumuşakça kaydırır |
| ← → (odak dışında) | Aynı şekilde salonda gezinir |
| Home / End | Serginin başına / sonuna gider |
| Alttaki ince çubuk | Sergide ne kadar ilerlendiğini gösterir |
| Esere tıkla | Odak modu: kamera esere döner, künye açılır |
| ← → (odak modunda) | Önceki / sonraki esere geçer |
| ESC veya boşluğa tıkla | Genel plana döner |
| Sol üst · Küratör / Giriş | Bileti yeniden açar |
| Sağ üst · hoparlör | Sergi ambiyansını açar / kapatır |

## Ses

Hiçbir ses dosyası yok; her şey tarayıcıda WebAudio ile canlı üretilir, bu yüzden
sergi her açılışta biraz farklı duyulur ve siteye ağırlık binmez.

- **Lofi piyano** — C minör pentatonik üzerinde 2.5–6 saniye arayla rastgele düşen
  üçgen dalga notalar, üretilmiş 3.4 saniyelik bir reverb'den geçer. Arada ikinci bir
  alçak nota eşlik eder.
- **Ayak sesleri** — zemindeki siluetler yürüdükçe adımlarıyla senkron tetiklenir
  (CSS yürüyüş döngüsüyle aynı 0.43 s tempoda). Figür kameraya göre nerede duruyorsa
  ses o yönden gelir, yaklaştıkça yükselir; halının üstünde boğuk, parkede tok çıkar
  ve salonun reverb'ünden geçtiği için yankılanır.
- Altta 420 Hz'den kesilmiş kahverengi gürültüyle salon uğultusu sürer.

Sesin tamamı bilinçli olarak çok kısıktır (tepe ≈ −32 dBFS).

Mobilde sahne yatay kaydırılabilir bir koridora dönüşür; esere dokununca tam ekran
sunum ve künye paneli açılır.

## Mimari

```
src/
  content/
    exhibition.ts     Bilet ve sergi künyesi metinleri
    photos.ts         Manifest + künyeyi birleştirip duvara asılan listeyi üretir
    photoManifest.ts  ÜRETİLİR — boyutlar, EXIF, ön izleme (elle düzenleme)
    photoMeta.ts      Künye: başlık, yer, hikâye (senin yazdığın tek dosya)
    demoPhotos.ts     Fotoğraf yokken asılan demo seçki
  lib/
    room.ts           Salon geometrisi, asma düzeni, kamera, yükleme halkası
    photoSources.ts   srcset / AVIF listelerini kurar
    placeholder.ts    Demo modun yer tutucu baskı üreteci
    ambience.ts       WebAudio ile üretilen lofi ambiyans + ayak sesleri (dosyasız)
    useViewport.ts    Ölçek ve medya sorguları
  components/
    PhotoImg.tsx      Her baskı buradan geçer: ön izleme + srcset + öncelik
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

## Yükleme stratejisi

100 eserlik bir sergide hiçbir zaman 100 fotoğraf inmez.

- **Ön izleme gömülüdür.** Her karenin 24 px'lik bulanık kopyası manifest'in içinde
  base64 olarak durur — ayrı istek yok. Çerçeve, gerçek dosya inene kadar boş değil.
- **Yükleme halkası.** Duvarda aynı anda ~3 eser görünür. Kameranın etrafındaki
  ~17 eserlik bir halka dışındaki hiçbir eser DOM'a girmez; halka kamera yürüdükçe
  kayar. Ekrandakiler `fetchpriority=high`, çevredekiler düşük öncelikle arkadan iner.
- **Boylar ölçüye göre.** 480 / 800 / 1280 px, her biri hem AVIF hem WebP. Chrome ile
  dört cihaz profilinde ölçüldü: duvardaki baskı 229-671 px, odak modu 350-701 px,
  telefonda tam ekran 1194 px arası yer kaplıyor. Her cihaz ihtiyacının en fazla
  1.4 katını indiriyor. (Bir boyu tek formatta üretmek onu AVIF destekleyen
  tarayıcılar için erişilmez kılardı — `<picture>` AVIF kaynağını seçerse artık
  WebP listesine hiç bakmaz.)
- **Zemin yansımaları** gömülü ön izlemeyi kullanır; `blur(5px)` ve %19 opaklık
  altında gerçek dosyadan ayırt edilmiyor, halka başına 17 istek eksiliyor.
- **Bilet ekranında sıfır fotoğraf iner.** Salona girişte ~5 dosya, birkaç saniye
  yürüdükten sonra ~12. Ölçülen değerler; toplam ilk görünüm yarım MB'ın altında.
