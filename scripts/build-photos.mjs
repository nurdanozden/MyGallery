/**
 * FOTOGRAF HATTI
 *
 *   photos-original/*.jpg  ->  public/photos/<slug>-<en>.webp|avif
 *                          ->  src/content/photoManifest.ts   (uretilir, elle duzenleme)
 *                          ->  src/content/photoMeta.ts       (kunye; sadece eksikler eklenir)
 *
 * Calistir: npm run photos        (bastan uret: npm run photos -- --force)
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import exifReader from 'exif-reader'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'photos-original')
const OUT_DIR = path.join(ROOT, 'public', 'photos')
const MANIFEST = path.join(ROOT, 'src', 'content', 'photoManifest.ts')
const META = path.join(ROOT, 'src', 'content', 'photoMeta.ts')
const CACHE = path.join(OUT_DIR, '.cache.json')

const FORCE = process.argv.includes('--force')

/**
 * Uzun kenara gore boyutlar. Tarayicinin gercek talebi olculdu (Chrome, dort
 * cihaz profili): duvardaki baski 229-671 px, odak modu 350-701 px, telefonda
 * tam ekran 1194 px. Boylar bu araliklara oturuyor; hicbir cihaz gerekenden
 * 1.4 kattan fazlasini indirmiyor.
 *
 * Her boy hem AVIF hem WebP: <picture> icinde AVIF kaynagi secilirse tarayici
 * YALNIZCA avif adaylarindan secer, webp listesine dusmez. Bir boyu tek formatta
 * uretmek onu AVIF destekleyen tarayicilar icin tumuyle erisilmez kilardi.
 */
const TIERS = [
  { edge: 480, webp: 74, avif: 46 },
  { edge: 800, webp: 75, avif: 50 },
  { edge: 1280, webp: 78, avif: 55 },
  { edge: 1920, webp: 80, avif: 58 },
]

/**
 * Ara boylarin ustune HER ZAMAN bir kopya daha: kaynagin tam cozunurlugu.
 *
 * Eskiden kaynaktan buyuk basamaklar tumuyle atlaniyordu, yani 989 px'lik bir
 * kare en fazla 800 px olarak servis ediliyordu - aradaki 189 piksel hic
 * kullanilmiyordu. Koleksiyonun 80 karesi bu yuzden olmasi gerekenden bulanikti.
 * Artik her eserin elindeki en buyuk piksel sayisi da bir aday olarak listeye
 * giriyor; tarayici gerekmedikce indirmiyor, gerektiginde bulabiliyor.
 *
 * Yukaridaki 700 px gibi olculer CSS pikseliydi; retina ekranda tarayici bunun
 * IKI KATINI ister - eski 1280'lik tavan tam orada yetmiyordu.
 */
const MAX_EDGE = 2560
/** Bu kopya odak modunda burun dibinde izlenen kopya: sikistirmada cimrilik yok. */
const NATIVE_Q = { webp: 82, avif: 60 }

/** Bir boy icin kalite: onu kapsayan ilk ara basamak, yoksa en ustu. */
const tierFor = (edge) => TIERS.find((t) => t.edge >= edge) ?? TIERS[TIERS.length - 1]

/**
 * Bir eser icin uretilecek uzun kenarlar: kaynaktan kucuk ara basamaklar +
 * kaynagin kendisi (MAX_EDGE ile sinirli). Buyutme asla yapilmaz.
 */
function edgesFor(long) {
  const top = Math.min(long, MAX_EDGE)
  const edges = TIERS.map((t) => t.edge).filter((e) => e < top)
  edges.push(top)
  return edges
}

const EXTS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'])

/** Fotograf makinesi / telefon / uygulama ciktisi adlari. */
const MACHINE_NAME = [
  /^(img|dsc|dscf|dscn|_mg_|_dsc|pxl|gopr|dji|photo|foto|image|p)[\s_-]*\d+$/i,
  /^(whatsapp|screenshot|screen[\s_-]?shot|ekran[\s_-]?g[oö]r[uü]nt[uü]s[uü]|received|fb_img|snapchat|signal)/i,
  // UUID / hex blok: 19C3F410-E800-41C2-A610-8B8F829C6BF5
  /^[0-9a-f]{6,}([-_][0-9a-f]{4,})*$/i,
]

/**
 * Dosya adi eser adi olarak kullanilabilir mi? Makine ciktisi kaliplarina ek
 * olarak, icinde ard arda uc harf bile gecmeyen adlari da eleriz - o adin
 * kunyede "19C3F410 E800 41C2" diye durmasindansa "Kare 042" durmasi iyidir.
 */
function isMachineName(name) {
  // "IMG_1234 (1)" gibi kopya eklerini kalip testinden once at.
  const base = name.replace(/\s*\(\d+\)$/, '').trim()
  if (MACHINE_NAME.some((re) => re.test(base))) return true
  return !/[a-zçğıöşü]{3,}/i.test(base)
}

const TR_MAP = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o',
  ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', î: 'i', û: 'u',
}

function slugify(name) {
  const s = name
    .replace(/[çÇğĞıİöÖşŞüÜâîû]/g, (c) => TR_MAP[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'kare'
}

/** "sessizligin-esigi" -> "Sessizligin Esigi" (orijinal adin harfleri korunur). */
function humanize(name) {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w ? w[0].toLocaleUpperCase('tr') + w.slice(1) : w))
    .join(' ')
}

function shutter(sec) {
  if (!sec) return ''
  if (sec >= 1) return `${Number(sec.toFixed(1))}s`
  return `1/${Math.round(1 / sec)}s`
}

/** EXIF blogundan kunyede gosterdigimiz dort deger + cekim tarihi. */
function readExif(buf) {
  const empty = { lens: '', aperture: '', shutter: '', iso: '' }
  if (!buf) return { exif: empty, year: null, takenAt: null }
  try {
    const tags = exifReader(buf)
    const p = tags.Photo ?? {}
    const focal = p.FocalLengthIn35mmFilm ?? p.FocalLength
    const taken = p.DateTimeOriginal ?? p.DateTimeDigitized ?? tags.Image?.DateTime
    const iso = p.ISOSpeedRatings ?? p.PhotographicSensitivity
    return {
      exif: {
        lens: focal ? `${Math.round(focal)}mm` : '',
        aperture: p.FNumber ? `f/${Number(p.FNumber.toFixed(1))}` : '',
        shutter: shutter(p.ExposureTime),
        iso: iso ? `ISO ${[].concat(iso)[0]}` : '',
      },
      year: taken ? new Date(taken).getFullYear() : null,
      takenAt: taken ? new Date(taken).getTime() : null,
    }
  } catch {
    return { exif: empty, year: null, takenAt: null }
  }
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

/** Karenin uc ana rengi (koyudan aciga): yer tutucu ve spot tonunu besler. */
async function tintOf(img) {
  const { data } = await img
    .clone()
    .resize(3, 1, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const cols = [0, 1, 2].map((i) => ({
    hex: hex(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]),
    lum: 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2],
  }))
  cols.sort((a, b) => a.lum - b.lum)
  return cols.map((c) => c.hex)
}

async function main() {
  let entries
  try {
    entries = (await fs.readdir(SRC_DIR)).filter((f) => EXTS.has(path.extname(f).toLowerCase()))
  } catch {
    console.error(`photos-original/ bulunamadi: ${SRC_DIR}`)
    process.exit(1)
  }
  if (!entries.length) {
    console.error('photos-original/ bos. JPG dosyalarini oraya kopyalayip tekrar calistir.')
    process.exit(1)
  }
  entries.sort((a, b) => a.localeCompare(b, 'tr'))

  await fs.mkdir(OUT_DIR, { recursive: true })
  const cache = FORCE
    ? {}
    : await fs
        .readFile(CACHE, 'utf8')
        .then(JSON.parse)
        .catch(() => ({}))
  const nextCache = {}

  const used = new Set()
  const records = []

  for (const [i, fileName] of entries.entries()) {
    const abs = path.join(SRC_DIR, fileName)
    const stat = await fs.stat(abs)
    const base = path.basename(fileName, path.extname(fileName))

    let slug = slugify(base)
    if (used.has(slug)) {
      let n = 2
      while (used.has(`${slug}-${n}`)) n++
      slug = `${slug}-${n}`
    }
    used.add(slug)

    /**
     * Damga dosyanin ICERIGINDEN turer, tarihinden degil. Iki sonucu var:
     * kopyalanan ama degismeyen bir foto yeniden uretilmez, ve cikti dosya
     * adlari icerikle birlikte degistigi icin CDN'de "bir yil sakla, bir daha
     * sorma" diyebiliyoruz - ayni adla degistirilen bir kare bayat kalmaz.
     */
    const stamp = createHash('sha1')
      .update(await fs.readFile(abs))
      .update(JSON.stringify({ TIERS, MAX_EDGE, NATIVE_Q }))
      .digest('hex')
      .slice(0, 8)

    const img = sharp(abs, { failOn: 'none' }).rotate() // EXIF donusunu piksellere isle
    const meta = await img.metadata()
    // .rotate() sonrasi gercek olculer: 5-8 arasi orientation'da en/boy yer degistirir.
    const swap = meta.orientation != null && meta.orientation >= 5
    const width = swap ? meta.height : meta.width
    const height = swap ? meta.width : meta.height
    const long = Math.max(width, height)
    const ratio = width / height
    const orientation = ratio > 1.06 ? 'landscape' : ratio < 0.94 ? 'portrait' : 'square'

    const { exif, year, takenAt } = readExif(meta.exif)
    const tint = await tintOf(img)

    const cached = cache[slug]
    const fresh = !FORCE && cached?.stamp === stamp
    const variants = []

    const edges = edgesFor(long)
    for (const edge of edges) {
      // Son boy kaynagin kendisi; ona en iyi kaliteyi veriyoruz.
      const q = edge === edges[edges.length - 1] ? NATIVE_Q : tierFor(edge)
      const vw = width >= height ? edge : Math.max(1, Math.round(edge * ratio))
      const vh = width >= height ? Math.max(1, Math.round(edge / ratio)) : edge
      const v = {
        w: vw,
        h: vh,
        webp: `${slug}-${edge}.${stamp}.webp`,
        avif: `${slug}-${edge}.${stamp}.avif`,
      }

      if (!fresh) {
        const resized = img
          .clone()
          .resize({ width: vw, height: vh, fit: 'inside', withoutEnlargement: true })
        await resized.clone().webp({ quality: q.webp, effort: 5 }).toFile(path.join(OUT_DIR, v.webp))
        await resized
          .clone()
          .avif({ quality: q.avif, effort: 4, chromaSubsampling: '4:2:0' })
          .toFile(path.join(OUT_DIR, v.avif))
      }
      variants.push(v)
    }

    const lqip =
      fresh && cached.lqip
        ? cached.lqip
        : 'data:image/webp;base64,' +
          (
            await img
              .clone()
              .resize({ width: 24, height: 24, fit: 'inside' })
              .blur(1.1)
              .webp({ quality: 32 })
              .toBuffer()
          ).toString('base64')

    nextCache[slug] = { stamp, lqip }
    records.push({
      slug,
      file: fileName,
      // Makine adiysa baslik siralamadan sonra numaralanir.
      title: isMachineName(base) ? null : humanize(base),
      year: year ?? new Date(stat.mtimeMs).getFullYear(),
      takenAt: takenAt ?? stat.mtimeMs,
      orientation,
      width,
      height,
      exif,
      tint,
      lqip,
      variants,
    })

    process.stdout.write(`\r  ${i + 1}/${entries.length}  ${slug}${fresh ? ' (onbellek)' : ''}          `)
  }
  process.stdout.write('\n')

  // Kronolojik asma: cekim tarihi olan once, esitlikte dosya adi.
  records.sort((a, b) => a.takenAt - b.takenAt || a.slug.localeCompare(b.slug, 'tr'))
  // Adsiz kareler duvardaki sirasina gore numaralanir.
  records.forEach((r, i) => {
    r.title ??= `Kare ${String(i + 1).padStart(3, '0')}`
  })

  // Artik kaynakta olmayan cikti dosyalarini temizle.
  const keep = new Set(
    records.flatMap((r) => r.variants.flatMap((v) => [v.webp, v.avif].filter(Boolean))),
  )
  for (const f of await fs.readdir(OUT_DIR)) {
    if (f !== '.cache.json' && !keep.has(f)) await fs.rm(path.join(OUT_DIR, f))
  }

  const body = records
    .map((r) => {
      const vs = r.variants
        .map(
          (v) =>
            `      { w: ${v.w}, h: ${v.h}, webp: '${v.webp}'${v.avif ? `, avif: '${v.avif}'` : ''} },`,
        )
        .join('\n')
      return `  {
    slug: '${r.slug}',
    file: ${JSON.stringify(r.file)},
    autoTitle: ${JSON.stringify(r.title)},
    year: ${r.year},
    orientation: '${r.orientation}',
    width: ${r.width},
    height: ${r.height},
    exif: { lens: '${r.exif.lens}', aperture: '${r.exif.aperture}', shutter: '${r.exif.shutter}', iso: '${r.exif.iso}' },
    tint: ['${r.tint[0]}', '${r.tint[1]}', '${r.tint[2]}'],
    lqip: '${r.lqip}',
    variants: [
${vs}
    ],
  },`
    })
    .join('\n')

  await fs.writeFile(
    MANIFEST,
    `/* OTOMATIK URETILDI - \`npm run photos\` bu dosyayi her seferinde bastan yazar.
   Eser adi / yeri / hikayesi icin photoMeta.ts dosyasini duzenle. */
import type { PhotoAsset } from '../types'

export const photoManifest: PhotoAsset[] = [
${body}
]
`,
    'utf8',
  )

  // photoMeta.ts: varsa dokunma, yalnizca yeni slug'lar icin bos satir ac.
  let metaSrc = await fs.readFile(META, 'utf8').catch(() => null)
  if (metaSrc == null) {
    metaSrc = `import type { PhotoMeta } from '../types'

/**
 * KUNYE
 * Eser adi, yeri ve hikayesi burada durur. \`npm run photos\` bu dosyayi ASLA
 * ezmez; yalnizca yeni eklenen fotograflar icin bos satir acar.
 *
 * Bos birakilan alanlar otomatik degerlere duser (baslik = dosya adi,
 * yil = EXIF cekim tarihi). Bos hikaye kunyede hic gosterilmez.
 */
export const photoMeta: Record<string, PhotoMeta> = {
}
`
  }
  const missing = records.filter((r) => !new RegExp(`(^|\\n)\\s*'${r.slug}'\\s*:`).test(metaSrc))
  if (missing.length) {
    const added = missing.map((r) => `  '${r.slug}': { title: '', place: '', story: '' },`).join('\n')
    const close = metaSrc.lastIndexOf('}')
    metaSrc = metaSrc.slice(0, close) + added + '\n' + metaSrc.slice(close)
  }
  await fs.writeFile(META, metaSrc, 'utf8')
  await fs.writeFile(CACHE, JSON.stringify(nextCache), 'utf8')

  const sizes = await Promise.all(
    [...keep].map((f) => fs.stat(path.join(OUT_DIR, f)).then((s) => s.size)),
  )
  const bytes = sizes.reduce((a, b) => a + b, 0)
  const kinds = { portrait: 0, landscape: 0, square: 0 }
  for (const r of records) kinds[r.orientation]++
  console.log(
    `\n${records.length} eser  ·  ${kinds.portrait} dikey / ${kinds.landscape} yatay / ${kinds.square} kare`,
  )
  console.log(`public/photos/  ${keep.size} dosya  ·  ${(bytes / 1048576).toFixed(1)} MB`)

  /**
   * Duvardaki baski retina ekranda ~460 px, odak modunda ~700 px genislik
   * istiyor. Kaynak bundan kucukse buyutme yapmiyoruz - eser oldugu gibi,
   * yani bulanik gorunur. Sessizce gecmesin.
   */
  const soft = records
    .filter((r) => Math.max(r.width, r.height) < 900)
    .sort((a, b) => Math.max(a.width, a.height) - Math.max(b.width, b.height))
  if (soft.length) {
    console.log(`
DIKKAT  ${soft.length} eserin cozunurlugu dusuk (uzun kenar < 900px):`)
    for (const r of soft.slice(0, 10)) {
      console.log(`  ${String(Math.max(r.width, r.height)).padStart(4)}px  ${r.file}`)
    }
    if (soft.length > 10) console.log(`  ... ve ${soft.length - 10} tane daha`)
    console.log('  Bunlarin orijinallerini disa aktarip uzerine yazmak duvarda fark eder.')
  }
  if (missing.length) console.log(`photoMeta.ts  ${missing.length} yeni kunye satiri acildi`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
