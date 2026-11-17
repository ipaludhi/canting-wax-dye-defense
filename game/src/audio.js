// CANTING: sound, synthesised with WebAudio — no audio files to load.
// The AudioContext is created only on the first user gesture (browsers block
// it before that). Sounds go through a master bus and an sfx bus; every
// envelope ramps to 0.001, never to 0, and at most a few sounds of one kind
// play at once.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.muted = false;
    this.playing = new Map();
    this.ambientTimer = null;
    this.ambientStep = 0;
  }

  // Create the context on first gesture. Safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.startAmbient();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short tone with a pitch slide and an exponential fade.
  tone(kind, freqFrom, freqTo, seconds, volume) {
    if (!this.ctx || this.muted) return;
    const count = this.playing.get(kind) || 0;
    if (count >= 3) return;
    this.playing.set(kind, count + 1);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === 'seal' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.onended = () => this.playing.set(kind, (this.playing.get(kind) || 1) - 1);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  // A filtered noise splash for dye spreading.
  splash() {
    if (!this.ctx || this.muted) return;
    const count = this.playing.get('splash') || 0;
    if (count >= 3) return;
    this.playing.set('splash', count + 1);
    const now = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    src.onended = () => this.playing.set('splash', (this.playing.get('splash') || 1) - 1);
    src.start(now);
  }

  // A soft plucked note for the ambient loop.
  note(freq, seconds, volume) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  // A gamelan-like pentatonic loop: a 16-step pattern, one soft note every
  // other step, a low gong every two rounds. Starts on the first gesture
  // and stays quiet under the sound effects.
  startAmbient() {
    if (this.ambientTimer || !this.ctx) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25];
    const pattern = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, 0];
    this.ambientTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const step = this.ambientStep % 16;
      this.ambientStep += 1;
      if (step % 2 === 0) this.note(scale[pattern[step]], 1.4, 0.08);
      if (this.ambientStep % 32 === 0) this.tone('gong', 130, 65, 2.0, 0.12);
    }, 550);
  }

  // A seal pluck whose pitch rises with the combo (phaser skill: pitch up
  // as combo/speed rises, so a hot streak sounds hot).
  pluck(combo = 1) {
    const rate = 1 + 0.06 * (combo - 1);
    this.tone('seal', 660 * rate, 990 * rate, 0.25, 0.3);
    this.tone('seal', 990 * rate, 1320 * rate, 0.3, 0.18);
  }

  wax() {
    this.tone('wax', 220, 180, 0.08, 0.1);
  }

  hurt() {
    this.tone('hurt', 180, 60, 0.4, 0.35);
  }

  gong() {
    this.tone('gong', 220, 110, 1.2, 0.4);
    this.tone('gong', 330, 165, 1.0, 0.2);
  }

  boss() {
    this.tone('boss', 90, 45, 0.8, 0.4);
  }
}
