# Orijinal fotoğraflar

JPG dosyalarını **doğrudan bu klasöre** bırak. Alt klasör kullanma.

Sonra proje kökünde:

    npm run photos

Script her fotoğraftan üç boy (480 / 1100 / 1800 px uzun kenar) WebP + AVIF
üretip `public/photos/` altına yazar, `src/content/photoManifest.ts` dosyasını
yeniler ve `src/content/photoMeta.ts` içine yeni eserler için boş künye satırı
ekler.

Bu klasör `.gitignore`'da: orijinaller repoya ve siteye girmez, yalnızca
optimize edilmiş kopyalar yayınlanır.

## Dosya adı = eser adı

`sessizligin-esigi.jpg`  ->  "Sessizliğin Eşiği"
`IMG_4821.jpg`           ->  "Kare 021" (fotoğraf makinesi adı tanınır, atlanır)

İsim/yer/hikâye'yi sonradan `src/content/photoMeta.ts` içinden düzenleyebilirsin;
`npm run photos` o dosyayı asla ezmez.
