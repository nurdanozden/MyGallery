/**
 * Sergi ambiyansı — hiç ses dosyası kullanmadan, WebAudio ile canlı üretilir.
 * Bu yüzden her açılışta biraz farklı çalar ve siteye hiç ağırlık binmez.
 *
 * İki katman var:
 *  1. Lofi piyano: C minör pentatonik üzerinde 2.5-6 saniye arayla rastgele
 *     düşen üçgen dalga notalar, üretilmiş 3.4 saniyelik bir reverb'den geçer.
 *     Altında 420 Hz'den kesilmiş kahverengi gürültüyle salon uğultusu sürer.
 *  2. Ayak sesleri: zemindeki siluetler yürüdükçe, adımlarıyla senkron olarak
 *     dışarıdan tetiklenir; aynı reverb'den geçtiği için salonda yankılanır.
 */

const SCALE = [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 349.23, 392.0, 523.25]

export type Footstep = {
  /** -1 sol, +1 sağ. */
  pan: number
  /** 0..1 — figür kameraya ne kadar yakınsa o kadar yüksek. */
  gain: number
  /** Halının üstündeyse boğuk, parkedeyse tok bir adım. */
  soft: boolean
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export class Ambience {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voice: GainNode | null = null
  private steps: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer: number | null = null
  private stopped = true

  /** Salonun yankısı: üretilmiş, sönümlenen gürültüden bir impulse. */
  private makeReverb(ctx: AudioContext) {
    const seconds = 3.4
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = buf
    return conv
  }

  /** Yüksek tavanlı bir salonun alçak uğultusu. */
  private roomTone(ctx: AudioContext, dest: AudioNode) {
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const g = ctx.createGain()
    g.gain.value = 0.055
    src.connect(lp).connect(g).connect(dest)
    src.start()
  }

  /** Ayak sesi için tek seferlik beyaz gürültü tamponu. */
  private stepNoise(ctx: AudioContext) {
    const len = Math.floor(ctx.sampleRate * 0.3)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  /** Tek bir piyano notası: üçgen dalga, üstünde hafif bir oktav parıltısı. */
  private note(ctx: AudioContext, dest: AudioNode, freq: number, when: number, velocity: number) {
    const g = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1100 + Math.random() * 700

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const shimmer = ctx.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.value = freq * 2.002
    const sg = ctx.createGain()
    sg.gain.value = 0.18

    osc.connect(g)
    shimmer.connect(sg).connect(g)
    g.connect(lp).connect(dest)

    const peak = 0.09 * velocity
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(peak, when + 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 4.2)

    osc.start(when)
    shimmer.start(when)
    osc.stop(when + 4.4)
    shimmer.stop(when + 4.4)
  }

  /** Notaları seyrek ve rastgele aralıklarla düşüren zamanlayıcı. */
  private schedule(ctx: AudioContext, voice: AudioNode) {
    const tick = () => {
      if (this.stopped) return
      const now = ctx.currentTime

      this.note(ctx, voice, SCALE[Math.floor(Math.random() * SCALE.length)], now + 0.05, rand(0.7, 1.2))
      if (Math.random() < 0.4) {
        this.note(ctx, voice, SCALE[Math.floor(Math.random() * 5)], now + 0.6 + Math.random(), 0.5)
      }

      this.timer = window.setTimeout(tick, rand(2600, 6400))
    }
    tick()
  }

  /** Bir siluet adım attığında dışarıdan çağrılır. */
  footstep({ pan, gain, soft }: Footstep) {
    const ctx = this.ctx
    if (!ctx || this.stopped || !this.noise || !this.steps) return

    const t = ctx.currentTime
    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.max(-1, Math.min(1, pan))

    // Ayakkabının zemine sürtünmesi
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = soft ? rand(260, 400) : rand(900, 1500)
    bp.Q.value = soft ? 0.7 : 1.5
    const ng = ctx.createGain()
    const peak = Math.max(0.02, gain) * (soft ? 0.055 : 0.1)
    ng.gain.setValueAtTime(peak, t)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.13 : 0.2))

    // Topuğun alçak vuruşu
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(soft ? 92 : 135, t)
    thump.frequency.exponentialRampToValueAtTime(46, t + 0.09)
    const tg = ctx.createGain()
    tg.gain.setValueAtTime(peak * 0.55, t)
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)

    src.connect(bp).connect(ng).connect(panner)
    thump.connect(tg).connect(panner)
    panner.connect(this.steps)

    src.start(t)
    src.stop(t + 0.32)
    thump.start(t)
    thump.stop(t + 0.16)
  }

  async start() {
    if (!this.stopped) return
    this.stopped = false

    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctor()

      const master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)

      const reverb = this.makeReverb(ctx)
      const wet = ctx.createGain()
      wet.gain.value = 0.85
      reverb.connect(wet).connect(master)

      const dry = ctx.createGain()
      dry.gain.value = 0.35
      dry.connect(master)

      const voice = ctx.createGain()
      voice.connect(reverb)
      voice.connect(dry)

      // Adımlar hem doğrudan hem de salonun yankısından duyulsun.
      const steps = ctx.createGain()
      steps.gain.value = 0.85
      const stepsDry = ctx.createGain()
      stepsDry.gain.value = 0.55
      steps.connect(stepsDry).connect(master)
      steps.connect(reverb)

      this.roomTone(ctx, master)

      this.ctx = ctx
      this.master = master
      this.voice = voice
      this.steps = steps
      this.noise = this.stepNoise(ctx)
    }

    if (this.timer === null) this.schedule(this.ctx, this.voice!)

    await this.ctx.resume()
    const g = this.master!.gain
    g.cancelScheduledValues(this.ctx.currentTime)
    g.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1.8)
  }

  stop() {
    this.stopped = true
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    if (this.ctx && this.master) {
      const g = this.master.gain
      g.cancelScheduledValues(this.ctx.currentTime)
      g.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.7)
    }
  }
}
