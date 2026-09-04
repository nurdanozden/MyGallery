/**
 * Sergi ambiyansı: dosya kullanmadan, WebAudio ile üretilen çok kısık bir
 * lofi piyano/pad dokusu + salon uğultusu. Her açılışta biraz farklı çalar.
 */
const SCALE = [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 349.23, 392.0, 523.25]

export class Ambience {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voice: GainNode | null = null
  private timer: number | null = null
  private stopped = true

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

  private schedule(ctx: AudioContext, voice: AudioNode) {
    const tick = () => {
      if (this.stopped) return
      const now = ctx.currentTime
      this.note(ctx, voice, SCALE[Math.floor(Math.random() * SCALE.length)], now + 0.05, 0.7 + Math.random() * 0.5)
      if (Math.random() < 0.4) {
        this.note(ctx, voice, SCALE[Math.floor(Math.random() * 5)], now + 0.6 + Math.random(), 0.5)
      }
      this.timer = window.setTimeout(tick, 2600 + Math.random() * 3800)
    }
    tick()
  }

  async start() {
    if (!this.stopped) return
    this.stopped = false
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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

      this.roomTone(ctx, master)
      this.ctx = ctx
      this.master = master
      this.voice = voice
    }
    if (this.timer === null) {
      this.schedule(this.ctx, this.voice!)
    }
    await this.ctx.resume()
    this.master!.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master!.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1.8)
  }

  stop() {
    this.stopped = true
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.7)
    }
  }
}
