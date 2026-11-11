/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export interface BazaarIntensityState {
  isPlaying: boolean;
  isShop: boolean;
  speedRatio: number; // e.g. 1.0 at base speed, up to ~2.5+ at high levels/boost
  level: number;
  isChaiBoostActive: boolean;
  isStumbling: boolean;
  comboCount: number;
  lives: number;
}

export class AudioController {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  ambientBus: GainNode | null = null;
  isMuted = false;

  // Dynamic Bazaar Ambience State
  private isAmbienceRunning = false;
  private murmurSource: AudioBufferSourceNode | null = null;
  private murmurFilter: BiquadFilterNode | null = null;
  private murmurGain: GainNode | null = null;
  private schedulerTimer: number | null = null;
  private stepIndex = 0;
  private lastHonkTime = 0;
  private lastVendorTime = 0;

  private intensityState: BazaarIntensityState = {
    isPlaying: false,
    isShop: false,
    speedRatio: 1.0,
    level: 1,
    isChaiBoostActive: false,
    isStumbling: false,
    comboCount: 0,
    lives: 3,
  };

  constructor() {
    // Lazy initialization
  }

  init() {
    if (!this.ctx) {
      // Support for standard and webkit prefixed AudioContext
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4; // Master volume
      this.masterGain.connect(this.ctx.destination);

      this.ambientBus = this.ctx.createGain();
      this.ambientBus.gain.value = 0.85;
      this.ambientBus.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime, 0.04);
    }
    return this.isMuted;
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

  // ============================================================================
  // DYNAMIC BAZAAR AMBIENT SOUND & UPBEAT PERCUSSION SYSTEM
  // ============================================================================

  updateBazaarIntensity(nextState: BazaarIntensityState) {
    this.intensityState = nextState;

    if (nextState.isPlaying || nextState.isShop) {
      if (!this.isAmbienceRunning) {
        this.startBazaarAmbience();
      }
      this.syncContinuousMurmur();
    } else {
      if (this.isAmbienceRunning) {
        this.stopBazaarAmbience();
      }
    }
  }

  startBazaarAmbience() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.ambientBus || this.isAmbienceRunning) return;

    this.isAmbienceRunning = true;
    this.stepIndex = 0;
    const now = this.ctx.currentTime;
    this.lastHonkTime = now + 0.8;
    this.lastVendorTime = now + 1.8;

    // 1. Start Continuous Bazaar Crowd & Traffic Murmur Bed
    const bufferLength = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferLength, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    this.murmurSource = this.ctx.createBufferSource();
    this.murmurSource.buffer = noiseBuffer;
    this.murmurSource.loop = true;

    this.murmurFilter = this.ctx.createBiquadFilter();
    this.murmurFilter.type = 'bandpass';
    this.murmurFilter.frequency.setValueAtTime(520, now);
    this.murmurFilter.Q.setValueAtTime(0.85, now);

    this.murmurGain = this.ctx.createGain();
    this.murmurGain.gain.setValueAtTime(0.01, now);
    this.murmurGain.gain.linearRampToValueAtTime(0.16, now + 0.6);

    this.murmurSource.connect(this.murmurFilter);
    this.murmurFilter.connect(this.murmurGain);
    this.murmurGain.connect(this.ambientBus);
    this.murmurSource.start(now);

    // 2. Start Dynamic Rhythm & Street Event Scheduler Loop
    this.scheduleNextTick();
  }

  stopBazaarAmbience() {
    this.isAmbienceRunning = false;
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.murmurSource) {
      try {
        this.murmurSource.stop();
        this.murmurSource.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.murmurSource = null;
    }
    this.murmurFilter = null;
    this.murmurGain = null;
  }

  private syncContinuousMurmur() {
    if (!this.ctx || !this.murmurFilter || !this.murmurGain) return;
    const { isShop, speedRatio, isChaiBoostActive, isStumbling } = this.intensityState;
    const t = this.ctx.currentTime;

    const clampedRatio = Math.max(0.7, Math.min(2.4, speedRatio));
    const targetFreq = isShop
      ? 360
      : isChaiBoostActive
      ? 920
      : isStumbling
      ? 400
      : 480 + (clampedRatio - 1) * 260;

    const targetGain = isShop ? 0.08 : 0.14 + Math.min(0.1, (clampedRatio - 1) * 0.07);

    this.murmurFilter.frequency.setTargetAtTime(targetFreq, t, 0.15);
    this.murmurGain.gain.setTargetAtTime(targetGain, t, 0.15);
  }

  private scheduleNextTick() {
    if (!this.isAmbienceRunning || !this.ctx || !this.ambientBus) return;

    const {
      isPlaying,
      isShop,
      speedRatio,
      level,
      isChaiBoostActive,
      isStumbling,
      comboCount,
      lives,
    } = this.intensityState;

    const rawIntensity =
      speedRatio +
      (level - 1) * 0.18 +
      (isChaiBoostActive ? 0.35 : 0) +
      Math.min(0.3, comboCount * 0.06) +
      (lives === 1 ? 0.2 : 0) -
      (isStumbling ? 0.25 : 0);

    const intensity = Math.max(0.75, Math.min(2.5, rawIntensity));

    this.playPercussionStep(this.stepIndex, intensity, isShop, isChaiBoostActive, isStumbling);

    const now = this.ctx.currentTime;
    if (isPlaying && !isShop) {
      const honkCooldown = Math.max(1.5, 4.2 - intensity * 1.05);
      if (now - this.lastHonkTime > honkCooldown && Math.random() < 0.32 * intensity) {
        this.lastHonkTime = now;
        this.playTrafficHonk(intensity);
      }

      const vendorCooldown = Math.max(2.8, 6.2 - intensity * 1.1);
      if (now - this.lastVendorTime > vendorCooldown && Math.random() < 0.24 * intensity) {
        this.lastVendorTime = now;
        this.playVendorCall(intensity);
      }
    }

    this.stepIndex = (this.stepIndex + 1) % 16;

    const stepMs = isShop
      ? 150
      : Math.round(Math.max(84, Math.min(148, 134 / Math.pow(intensity, 0.42))));

    this.schedulerTimer = window.setTimeout(() => this.scheduleNextTick(), stepMs);
  }

  private playPercussionStep(
    step: number,
    intensity: number,
    isShop: boolean,
    isChaiBoost: boolean,
    isStumbling: boolean
  ) {
    if (!this.ctx || !this.ambientBus) return;
    const t = this.ctx.currentTime;
    const volScale = isShop ? 0.35 : isStumbling ? 0.65 : 1.0;

    // 1. BAYAN (Deep resonant Dholak/Tabla bass drum)
    const isBayanHit =
      step === 0 ||
      step === 6 ||
      step === 10 ||
      (intensity >= 1.15 && step === 3) ||
      (intensity >= 1.45 && step === 14);

    if (isBayanHit) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const isAccent = step === 0 || step === 10;
      const startFreq = isAccent ? 98 : 86;
      const pitchSlide = step === 6 || step === 14 ? 132 : 72;

      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(pitchSlide, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(58, t + 0.19);

      const peakGain = (isAccent ? 0.24 : 0.17) * volScale;
      gain.gain.setValueAtTime(0.005, t);
      gain.gain.linearRampToValueAtTime(peakGain, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.004, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ambientBus);
      osc.start(t);
      osc.stop(t + 0.21);
    }

    // 2. DAYAN (Crisp tuned woody tabla/dholak rim stroke)
    const isDayanHit =
      step === 2 ||
      step === 4 ||
      step === 8 ||
      step === 12 ||
      (intensity >= 1.25 && (step === 7 || step === 15)) ||
      (intensity >= 1.55 && (step === 11 || step === 13));

    if (isDayanHit && !isShop) {
      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      overtone.type = 'sine';

      const isRimNa = step === 4 || step === 12 || step === 15;
      const fundFreq = isRimNa ? 440 : 293.66;

      osc.frequency.setValueAtTime(fundFreq * 1.12, t);
      osc.frequency.exponentialRampToValueAtTime(fundFreq, t + 0.04);

      overtone.frequency.setValueAtTime(fundFreq * 2.4, t);
      overtone.frequency.exponentialRampToValueAtTime(fundFreq * 2.0, t + 0.05);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isRimNa ? 1350 : 880, t);
      filter.Q.setValueAtTime(3.0, t);

      const strokeGain = (step % 4 === 0 ? 0.14 : 0.095) * volScale;
      gain.gain.setValueAtTime(0.005, t);
      gain.gain.linearRampToValueAtTime(strokeGain, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.003, t + 0.095);

      osc.connect(filter);
      overtone.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientBus);

      osc.start(t);
      osc.stop(t + 0.1);
      overtone.start(t);
      overtone.stop(t + 0.1);
    }

    // 3. GHUNGROO / CHAI-GLASS SHAKER
    if (intensity >= 1.1 && !isShop && (step % 2 === 1 || isChaiBoost)) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.045);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5200, t);

      const gain = this.ctx.createGain();
      const shakerVol = (step % 4 === 2 ? 0.055 : 0.03) * Math.min(1.4, intensity * 0.75);
      gain.gain.setValueAtTime(shakerVol, t);
      gain.gain.exponentialRampToValueAtTime(0.002, t + 0.042);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientBus);
      noise.start(t);
      noise.stop(t + 0.045);
    }

    // 4. UPBEAT PLUCKED TUMBI / EKTARA RIFF
    if ((intensity >= 1.35 || isChaiBoost) && !isShop && (step === 0 || step === 3 || step === 6 || step === 10 || step === 12)) {
      const tumbiNotes: Record<number, number> = {
        0: 293.66,
        3: 369.99,
        6: 440.0,
        10: 523.25,
        12: 440.0,
      };
      const freq = tumbiNotes[step] || 293.66;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.97, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.025);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1650, t);
      filter.Q.setValueAtTime(4.2, t);

      const riffVol = isChaiBoost ? 0.085 : 0.055;
      gain.gain.setValueAtTime(0.004, t);
      gain.gain.linearRampToValueAtTime(riffVol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.003, t + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientBus);
      osc.start(t);
      osc.stop(t + 0.14);
    }
  }

  private playTrafficHonk(intensity: number) {
    if (!this.ctx || !this.ambientBus) return;
    const t = this.ctx.currentTime;

    const isBulbHorn = Math.random() < 0.62;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      const startPan = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5);
      panner.pan.setValueAtTime(startPan, t);
      panner.pan.linearRampToValueAtTime(-startPan * 0.5, t + 0.45);
      panner.connect(this.ambientBus);
    }
    const targetNode = panner || this.ambientBus;

    const honkCount = Math.random() < 0.7 ? 2 : 1;
    const baseFreq = isBulbHorn ? 415 + Math.random() * 45 : 690 + Math.random() * 80;

    for (let i = 0; i < honkCount; i++) {
      const start = t + i * (isBulbHorn ? 0.16 : 0.12);
      const dur = isBulbHorn ? 0.13 : 0.095;
      const doppler = i === 1 ? 0.96 : 1.0;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = isBulbHorn ? 'square' : 'triangle';

      osc1.frequency.setValueAtTime(baseFreq * doppler, start);
      osc2.frequency.setValueAtTime(baseFreq * (isBulbHorn ? 1.24 : 1.5) * doppler, start);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isBulbHorn ? 1150 : 1850, start);
      filter.Q.setValueAtTime(3.5, start);

      const peakVol = Math.min(0.14, 0.075 + intensity * 0.025);
      gain.gain.setValueAtTime(0.003, start);
      gain.gain.linearRampToValueAtTime(peakVol, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.003, start + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(targetNode);

      osc1.start(start);
      osc1.stop(start + dur + 0.01);
      osc2.start(start);
      osc2.stop(start + dur + 0.01);
    }
  }

  private playVendorCall(intensity: number) {
    if (!this.ctx || !this.ambientBus) return;
    const t = this.ctx.currentTime;

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      const side = Math.random() < 0.5 ? -0.72 : 0.72;
      panner.pan.setValueAtTime(side, t);
      panner.connect(this.ambientBus);
    }
    const targetNode = panner || this.ambientBus;

    const patternIdx = Math.floor(Math.random() * 3);
    const pitchScale = 0.92 + Math.random() * 0.22;

    const callSyllables =
      patternIdx === 0
        ? [
            { offset: 0.0, dur: 0.22, fStart: 220, fPeak: 285, fEnd: 270, formant: 1100 },
            { offset: 0.25, dur: 0.12, fStart: 260, fPeak: 240, fEnd: 210, formant: 850 },
            { offset: 0.39, dur: 0.18, fStart: 240, fPeak: 310, fEnd: 195, formant: 1250 },
          ]
        : patternIdx === 1
        ? [
            { offset: 0.0, dur: 0.11, fStart: 210, fPeak: 245, fEnd: 230, formant: 950 },
            { offset: 0.13, dur: 0.14, fStart: 245, fPeak: 295, fEnd: 260, formant: 720 },
            { offset: 0.30, dur: 0.22, fStart: 290, fPeak: 330, fEnd: 215, formant: 1180 },
          ]
        : [
            { offset: 0.0, dur: 0.14, fStart: 235, fPeak: 310, fEnd: 265, formant: 1200 },
            { offset: 0.17, dur: 0.16, fStart: 275, fPeak: 340, fEnd: 220, formant: 980 },
          ];

    callSyllables.forEach(s => {
      const start = t + s.offset;
      const osc = this.ctx!.createOscillator();
      const formant1 = this.ctx!.createBiquadFilter();
      const formant2 = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s.fStart * pitchScale, start);
      osc.frequency.exponentialRampToValueAtTime(s.fPeak * pitchScale, start + s.dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(s.fEnd * pitchScale, start + s.dur);

      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(s.formant, start);
      formant1.Q.setValueAtTime(4.5, start);

      formant2.type = 'bandpass';
      formant2.frequency.setValueAtTime(s.formant * 1.85, start);
      formant2.Q.setValueAtTime(5.0, start);

      const callVol = Math.min(0.11, 0.055 + intensity * 0.02);
      gain.gain.setValueAtTime(0.002, start);
      gain.gain.linearRampToValueAtTime(callVol, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.002, start + s.dur);

      osc.connect(formant1);
      osc.connect(formant2);
      formant1.connect(gain);
      formant2.connect(gain);
      gain.connect(targetNode);

      osc.start(start);
      osc.stop(start + s.dur + 0.01);
    });
  }
}

export const audio = new AudioController();
