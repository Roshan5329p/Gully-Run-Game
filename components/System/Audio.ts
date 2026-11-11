/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export class AudioController {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  constructor() {
    // Lazy initialization
  }

  init() {
    if (!this.ctx) {
      // Support for standard and webkit prefixed AudioContext
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4; // Master volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playGemCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // High pitch "ding" with slight upward inflection
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playLetterCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Play a major chord (C Majorish: C5, E5, G5) for a rewarding sound
    const freqs = [523.25, 659.25, 783.99]; 
    
    freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = f;
        
        // Stagger start times slightly for an arpeggio feel
        const start = t + (i * 0.04);
        const dur = 0.3;

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        
        osc.start(start);
        osc.stop(start + dur);
    });
  }

  playJump(isDouble = false) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Sine wave for a smooth "whoop" sound
    osc.type = 'sine';
    
    // Pitch shift up for double jump
    const startFreq = isDouble ? 400 : 200;
    const endFreq = isDouble ? 800 : 450;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15);

    // Lower volume for jump as it is a frequent action
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playDamage() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // 1. Noise buffer for "crunch/static"
    const bufferSize = this.ctx.sampleRate * 0.3; // 0.3 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // 2. Low oscillator for "thud/impact"
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  playUncleShout(isUrgent = false) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Synthesize a 2-syllable expressive "Arey! / Oye!" angry Uncle vocal bark
    const syllables = isUrgent
      ? [
          { offset: 0, dur: 0.11, fStart: 195, fPeak: 290, fEnd: 220 },
          { offset: 0.13, dur: 0.16, fStart: 240, fPeak: 350, fEnd: 170 },
        ]
      : [
          { offset: 0, dur: 0.1, fStart: 155, fPeak: 225, fEnd: 180 },
          { offset: 0.12, dur: 0.14, fStart: 185, fPeak: 255, fEnd: 140 },
        ];

    syllables.forEach(s => {
      const start = t + s.offset;
      const osc = this.ctx!.createOscillator();
      const subOsc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      subOsc.type = 'triangle';

      osc.frequency.setValueAtTime(s.fStart, start);
      osc.frequency.exponentialRampToValueAtTime(s.fPeak, start + s.dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(s.fEnd, start + s.dur);

      subOsc.frequency.setValueAtTime(s.fStart * 0.5, start);
      subOsc.frequency.exponentialRampToValueAtTime(s.fPeak * 0.5, start + s.dur * 0.45);
      subOsc.frequency.exponentialRampToValueAtTime(s.fEnd * 0.5, start + s.dur);

      // Vocal formant bandpass filter
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isUrgent ? 950 : 780, start);
      filter.Q.setValueAtTime(3.2, start);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(isUrgent ? 0.36 : 0.24, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.008, start + s.dur);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + s.dur);
      subOsc.start(start);
      subOsc.stop(start + s.dur);
    });
  }

  playChappalWindup() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Two rapid warning lock-on beeps + rising tension whistle
    [0, 0.18].forEach((offset, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      const baseFreq = idx === 0 ? 580 : 740;
      osc.frequency.setValueAtTime(baseFreq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, t + offset + 0.12);

      gain.gain.setValueAtTime(0.28, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.14);
    });
  }

  playChappalThrow() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Aerodynamic spinning whoosh (filtered noise + pitch sweep)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(320, t + 0.26);
    filter.Q.setValueAtTime(2.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, t);
    noiseGain.gain.linearRampToValueAtTime(0.45, t + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.27);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.24);

    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.28);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playStumble() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Clay pot / crate clatter + cartoon slip pitch wobble
    [0, 0.07, 0.15].forEach((offset, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'square' : 'triangle';
      const startFreq = 340 - idx * 65;
      osc.frequency.setValueAtTime(startFreq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(110, t + offset + 0.08);

      gain.gain.setValueAtTime(0.28, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.09);
    });
  }

  playChaiBoost() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // 1. Quick high-energy "Slurp!" pitch sweep (0.0s - 0.16s)
    const slurpOsc = this.ctx.createOscillator();
    const slurpFilter = this.ctx.createBiquadFilter();
    const slurpGain = this.ctx.createGain();
    slurpOsc.type = 'sawtooth';
    slurpOsc.frequency.setValueAtTime(240, t);
    slurpOsc.frequency.exponentialRampToValueAtTime(680, t + 0.11);
    slurpOsc.frequency.exponentialRampToValueAtTime(520, t + 0.16);

    slurpFilter.type = 'bandpass';
    slurpFilter.frequency.setValueAtTime(900, t);
    slurpFilter.frequency.exponentialRampToValueAtTime(2200, t + 0.14);
    slurpFilter.Q.setValueAtTime(4.0, t);

    slurpGain.gain.setValueAtTime(0.02, t);
    slurpGain.gain.linearRampToValueAtTime(0.32, t + 0.05);
    slurpGain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    slurpOsc.connect(slurpFilter);
    slurpFilter.connect(slurpGain);
    slurpGain.connect(this.masterGain);
    slurpOsc.start(t);
    slurpOsc.stop(t + 0.17);

    // 2. Expressive "Hot Chai Steam" hiss burst (0.14s - 0.42s)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const steamNoise = this.ctx.createBufferSource();
    steamNoise.buffer = buffer;

    const steamFilter = this.ctx.createBiquadFilter();
    steamFilter.type = 'bandpass';
    steamFilter.frequency.setValueAtTime(2600, t + 0.14);
    steamFilter.frequency.exponentialRampToValueAtTime(1400, t + 0.42);
    steamFilter.Q.setValueAtTime(1.8, t + 0.14);

    const steamGain = this.ctx.createGain();
    steamGain.gain.setValueAtTime(0.01, t + 0.14);
    steamGain.gain.linearRampToValueAtTime(0.22, t + 0.19);
    steamGain.gain.exponentialRampToValueAtTime(0.008, t + 0.42);

    steamNoise.connect(steamFilter);
    steamFilter.connect(steamGain);
    steamGain.connect(this.masterGain);
    steamNoise.start(t + 0.14);
    steamNoise.stop(t + 0.42);

    // 3. Refreshing upward masala-chai turbo arpeggio (D5 -> F#5 -> A5 -> D6)
    const freqs = [587.33, 739.99, 880.0, 1174.66];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      const start = t + 0.12 + i * 0.045;
      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 1.08, start + 0.18);

      gain.gain.setValueAtTime(0.32, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  playComboTick(comboCount = 1) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const step = Math.min(8, Math.max(1, comboCount));
    const baseFreq = 520 + step * 85;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, t + 0.09);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }
}

export const audio = new AudioController();
