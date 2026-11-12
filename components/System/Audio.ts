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
  private chatterFilter: BiquadFilterNode | null = null;
  private chatterGain: GainNode | null = null;
  private murmurLfo: OscillatorNode | null = null;
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

  /**
   * Triggers mobile haptic feedback via the Web Vibration API when supported.
   * Runs independently of audio mute state so tactile feedback always works on mobile.
   */
  vibrate(pattern: number | number[]) {
    try {
      if (typeof window !== 'undefined' && ' navigator' in window === false && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on desktop or browsers without Vibration API support
    }
  }

  vibrateObstacleHit() {
    // Heavy double-jolt impact vibration for hitting an obstacle or flying chappal
    this.vibrate([120, 45, 160]);
  }

  vibrateStumble() {
    // Quick two-tap trip vibration when stumbling over bazaar debris
    this.vibrate([55, 35, 55]);
  }

  vibrateChaiPickup() {
    // Rising 3-pulse celebratory vibration matching the Cutting Chai sip & boost rush
    this.vibrate([35, 30, 60, 25, 95]);
  }

  vibrateChaiSmash() {
    // Crisp tactile pulse when smashing through an obstacle during Cutting Chai invincibility
    this.vibrate(45);
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

  playSlide() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Sneaker & denim road-slide swoosh (filtered noise sweep + downward pitch glide)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.24);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(420, t + 0.22);
    filter.Q.setValueAtTime(2.2, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, t);
    noiseGain.gain.linearRampToValueAtTime(0.28, t + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.23);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.18);

    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.19);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.24);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playCowBell() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Brass temple/cow bell metallic clank (2 inharmonic partials)
    [780, 1185].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.28);

      gain.gain.setValueAtTime(idx === 0 ? 0.22 : 0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.31);
    });
  }

  playDamage() {
    this.vibrateObstacleHit();
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

  playChappalThrow(pan = 0) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t);
      panner.connect(this.masterGain);
    }
    const targetNode = panner || this.masterGain;

    // 1. Initial launch snap + spinning leather slipper aerodynamic whoosh-whir-whoosh
    const dur = 0.48;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Modulate noise with a 19 Hz rotational envelope so you hear each flip of the spinning chappal!
      const timeSec = i / this.ctx.sampleRate;
      const spinEnvelope = 0.45 + 0.55 * Math.pow(Math.sin(timeSec * Math.PI * 19), 2);
      data[i] = (Math.random() * 2 - 1) * spinEnvelope;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1550, t);
    filter.frequency.exponentialRampToValueAtTime(340, t + dur);
    filter.Q.setValueAtTime(2.8, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, t);
    noiseGain.gain.linearRampToValueAtTime(0.52, t + 0.045);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    // 2. Rotational Doppler whistle tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, t);
    osc.frequency.exponentialRampToValueAtTime(145, t + 0.36);

    oscGain.gain.setValueAtTime(0.24, t);
    oscGain.gain.exponentialRampToValueAtTime(0.008, t + 0.36);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(targetNode);

    osc.connect(oscGain);
    oscGain.connect(targetNode);

    noise.start(t);
    noise.stop(t + dur);
    osc.start(t);
    osc.stop(t + 0.37);
  }

  /**
   * Plays a spatialized spinning 'chappal' aerodynamic whoosh as a slipper
   * slices through the air near or past the player.
   */
  playChappalWhoosh(pan = 0, proximity = 1.0) {
    this.vibrate(25);
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const clampedPan = Math.max(-1, Math.min(1, pan));
    const clampedProx = Math.max(0.35, Math.min(1.4, proximity));

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(clampedPan, t);
      panner.pan.linearRampToValueAtTime(-clampedPan * 0.4, t + 0.34);
      panner.connect(this.masterGain);
    }
    const targetNode = panner || this.masterGain;

    // Spinning slipper rotational air-slice ("whir-whoosh-whir!")
    const dur = 0.36;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const sec = i / this.ctx.sampleRate;
      const flutter = 0.32 + 0.68 * Math.pow(Math.sin(sec * Math.PI * 24), 2);
      data[i] = (Math.random() * 2 - 1) * flutter;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1650 * clampedProx, t);
    filter.frequency.exponentialRampToValueAtTime(260, t + dur);
    filter.Q.setValueAtTime(2.6, t);

    const gain = this.ctx.createGain();
    const peak = Math.min(0.62, 0.38 * clampedProx);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.065);
    gain.gain.exponentialRampToValueAtTime(0.008, t + dur);

    // Expressive Doppler pitch whip as the chappal slices past the player's ears
    const dopplerOsc = this.ctx.createOscillator();
    const dopplerGain = this.ctx.createGain();
    dopplerOsc.type = 'triangle';
    dopplerOsc.frequency.setValueAtTime(480 * clampedProx, t);
    dopplerOsc.frequency.exponentialRampToValueAtTime(130, t + dur);

    dopplerGain.gain.setValueAtTime(0.005, t);
    dopplerGain.gain.linearRampToValueAtTime(0.2 * clampedProx, t + 0.06);
    dopplerGain.gain.exponentialRampToValueAtTime(0.004, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    dopplerOsc.connect(dopplerGain);
    dopplerGain.connect(targetNode);

    noise.start(t);
    noise.stop(t + dur);
    dopplerOsc.start(t);
    dopplerOsc.stop(t + dur);
  }

  /**
   * Plays an authentic Indian Auto-Rickshaw rubber bulb horn ("Pom-Pom!")
   * or metallic electric horn, spatialized by lane/direction and distance.
   */
  playAutoRickshawHonk(pan = 0, distanceFactor = 0.6) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.ambientBus) return;

    const t = this.ctx.currentTime;
    const clampedPan = Math.max(-1, Math.min(1, pan));
    const closeness = Math.max(0.2, Math.min(1.2, distanceFactor));

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(clampedPan, t);
      panner.pan.linearRampToValueAtTime(clampedPan * 0.4, t + 0.38);
      panner.connect(this.ambientBus);
    }
    const targetNode = panner || this.ambientBus;

    // Classic Indian Auto-Rickshaw Double squeeze bulb-horn ("Pom-Pom!")
    const baseFreq = 410 + Math.random() * 45;
    const pulses = [
      { start: 0, dur: 0.12, doppler: 1.02 },
      { start: 0.15, dur: 0.15, doppler: 0.96 },
    ];

    pulses.forEach(p => {
      const start = t + p.start;
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const nasalFilter = this.ctx!.createBiquadFilter();
      const distLowpass = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      osc1.frequency.setValueAtTime(baseFreq * p.doppler, start);
      osc2.frequency.setValueAtTime(baseFreq * 1.26 * p.doppler, start);

      // Nasal horn reed resonance
      nasalFilter.type = 'bandpass';
      nasalFilter.frequency.setValueAtTime(1120, start);
      nasalFilter.Q.setValueAtTime(3.6, start);

      // Distance air-absorption lowpass filter (distant honks sound warm & muffled)
      distLowpass.type = 'lowpass';
      distLowpass.frequency.setValueAtTime(900 + closeness * 2200, start);

      const peakVol = Math.min(0.22, 0.06 + closeness * 0.13);
      gain.gain.setValueAtTime(0.002, start);
      gain.gain.linearRampToValueAtTime(peakVol, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.003, start + p.dur);

      osc1.connect(nasalFilter);
      osc2.connect(nasalFilter);
      nasalFilter.connect(distLowpass);
      distLowpass.connect(gain);
      gain.connect(targetNode);

      osc1.start(start);
      osc1.stop(start + p.dur + 0.01);
      osc2.start(start);
      osc2.stop(start + p.dur + 0.01);
    });
  }

  /**
   * 3D Spatialized Shopkeeper & Neighbor Voice Synthesizer.
   * Positions a 3D HRTF PannerNode at the exact bazaar stall or upper balcony (left/right X, height Y, depth Z)
   * and sweeps Z past the listener as the runner sprints past the stall while synthesizing expressive
   * multi-syllable Hindi vocal formants ("Ae! Sambhal ke!", "Dekh ke chalo!", etc.).
   */
  playSpatialBazaarYell(
    phraseIndex: number,
    worldX: number,
    worldY: number,
    worldZ: number,
    playerX: number,
    runSpeed = 22.5
  ) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const relX = worldX - playerX;
    const relY = worldY - 1.5;
    const startZ = worldZ;
    const totalDur = 0.95;
    const endZ = startZ + runSpeed * totalDur;

    // Set up 3D Spatial PannerNode (HRTF) with Doppler-like pass-by motion from ahead (-Z) to behind (+Z)
    let spatialNode: AudioNode = this.masterGain;
    if (typeof this.ctx.createPanner === 'function') {
      const panner3d = this.ctx.createPanner();
      panner3d.panningModel = 'HRTF';
      panner3d.distanceModel = 'inverse';
      panner3d.refDistance = 5.0;
      panner3d.maxDistance = 45.0;
      panner3d.rolloffFactor = 1.25;

      if (panner3d.positionX && panner3d.positionY && panner3d.positionZ) {
        panner3d.positionX.setValueAtTime(relX, t);
        panner3d.positionY.setValueAtTime(relY, t);
        panner3d.positionZ.setValueAtTime(startZ, t);
        panner3d.positionZ.linearRampToValueAtTime(endZ, t + totalDur);
      } else {
        panner3d.setPosition(relX, relY, startZ);
      }
      panner3d.connect(this.masterGain);
      spatialNode = panner3d;
    } else if (this.ctx.createStereoPanner) {
      const stereo = this.ctx.createStereoPanner();
      const panVal = Math.max(-1, Math.min(1, relX / 6.5));
      stereo.pan.setValueAtTime(panVal, t);
      stereo.connect(this.masterGain);
      spatialNode = stereo;
    }

    // Distinct vocal timbre & syllable cadence per phrase ("Ae! Sambhal ke!", "Dekh ke chalo!", etc.)
    interface VocalSyllable {
      offset: number;
      dur: number;
      f0Start: number;
      f0Peak: number;
      f0End: number;
      f1: number; // Vowel open/close formant
      f2: number; // Vowel front/back formant
      consonantBurst?: boolean;
    }

    const patterns: VocalSyllable[][] = [
      // 0: "Ae! Sambhal ke!" (Sharp 'Ae!' warning + 3-syllable 'Sam-bhal ke!')
      [
        { offset: 0.0, dur: 0.19, f0Start: 215, f0Peak: 310, f0End: 265, f1: 680, f2: 1850, consonantBurst: true },
        { offset: 0.24, dur: 0.14, f0Start: 225, f0Peak: 255, f0End: 230, f1: 620, f2: 1320, consonantBurst: true },
        { offset: 0.4, dur: 0.18, f0Start: 245, f0Peak: 295, f0End: 240, f1: 740, f2: 1280 },
        { offset: 0.6, dur: 0.22, f0Start: 270, f0Peak: 320, f0End: 195, f1: 540, f2: 1920, consonantBurst: true },
      ],
      // 1: "Dekh ke chalo!" (Urgent 4-syllable 'Dekh - ke - cha - lo!')
      [
        { offset: 0.0, dur: 0.2, f0Start: 190, f0Peak: 275, f0End: 240, f1: 530, f2: 1880, consonantBurst: true },
        { offset: 0.23, dur: 0.13, f0Start: 235, f0Peak: 260, f0End: 225, f1: 510, f2: 1950, consonantBurst: true },
        { offset: 0.39, dur: 0.14, f0Start: 240, f0Peak: 285, f0End: 250, f1: 710, f2: 1420, consonantBurst: true },
        { offset: 0.55, dur: 0.24, f0Start: 265, f0Peak: 305, f0End: 175, f1: 480, f2: 920 },
      ],
      // 2: "Oye! Dukaan bacha ke!" (High-energy shopkeeper bark)
      [
        { offset: 0.0, dur: 0.18, f0Start: 230, f0Peak: 335, f0End: 280, f1: 520, f2: 1050 },
        { offset: 0.22, dur: 0.13, f0Start: 240, f0Peak: 265, f0End: 245, f1: 380, f2: 950, consonantBurst: true },
        { offset: 0.37, dur: 0.17, f0Start: 255, f0Peak: 300, f0End: 260, f1: 760, f2: 1280, consonantBurst: true },
        { offset: 0.56, dur: 0.14, f0Start: 260, f0Peak: 290, f0End: 250, f1: 680, f2: 1450 },
        { offset: 0.72, dur: 0.2, f0Start: 285, f0Peak: 325, f0End: 205, f1: 540, f2: 1920, consonantBurst: true },
      ],
      // 3: "Arey! Garam chai hai, dekh ke!" (High-pitched Tapri vendor warning)
      [
        { offset: 0.0, dur: 0.16, f0Start: 250, f0Peak: 345, f0End: 295, f1: 720, f2: 1620 },
        { offset: 0.19, dur: 0.15, f0Start: 275, f0Peak: 315, f0End: 270, f1: 690, f2: 1350, consonantBurst: true },
        { offset: 0.36, dur: 0.19, f0Start: 290, f0Peak: 360, f0End: 285, f1: 780, f2: 1750, consonantBurst: true },
        { offset: 0.58, dur: 0.22, f0Start: 310, f0Peak: 350, f0End: 215, f1: 540, f2: 1900, consonantBurst: true },
      ],
      // 4: "Hato re! Gully mein mat bhaago!" (Neighbor yelling from upper balcony)
      [
        { offset: 0.0, dur: 0.17, f0Start: 265, f0Peak: 360, f0End: 310, f1: 740, f2: 1380, consonantBurst: true },
        { offset: 0.19, dur: 0.16, f0Start: 305, f0Peak: 380, f0End: 290, f1: 490, f2: 960 },
        { offset: 0.39, dur: 0.16, f0Start: 285, f0Peak: 330, f0End: 275, f1: 650, f2: 1550, consonantBurst: true },
        { offset: 0.57, dur: 0.24, f0Start: 315, f0Peak: 370, f0End: 220, f1: 760, f2: 1180, consonantBurst: true },
      ],
    ];

    const syllables = patterns[phraseIndex % patterns.length];
    // Balcony neighbors have a slightly higher, brighter vocal pitch than ground-floor shopkeepers
    const isBalconyVoice = worldY > 4.5;
    const pitchMult = (isBalconyVoice ? 1.14 : 0.96) * (0.95 + Math.random() * 0.1);

    syllables.forEach(s => {
      const start = t + s.offset;

      // Optional consonant plosive burst ("D", "K", "S", "Ch") at syllable onset for realistic speech articulation
      if (s.consonantBurst) {
        const cDur = 0.032;
        const cBuf = this.ctx!.createBuffer(1, Math.floor(this.ctx!.sampleRate * cDur), this.ctx!.sampleRate);
        const cData = cBuf.getChannelData(0);
        for (let i = 0; i < cData.length; i++) {
          cData[i] = (Math.random() * 2 - 1) * (1 - i / cData.length);
        }
        const cNoise = this.ctx!.createBufferSource();
        cNoise.buffer = cBuf;

        const cFilter = this.ctx!.createBiquadFilter();
        cFilter.type = 'bandpass';
        cFilter.frequency.setValueAtTime(2400, start);
        cFilter.Q.setValueAtTime(2.5, start);

        const cGain = this.ctx!.createGain();
        cGain.gain.setValueAtTime(0.18, start);
        cGain.gain.exponentialRampToValueAtTime(0.005, start + cDur);

        cNoise.connect(cFilter);
        cFilter.connect(cGain);
        cGain.connect(spatialNode);
        cNoise.start(start);
        cNoise.stop(start + cDur);
      }

      // Glottal vocal cord source (sawtooth + sub-harmonic triangle + natural vibrato)
      const osc = this.ctx!.createOscillator();
      const subOsc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      subOsc.type = 'triangle';

      osc.frequency.setValueAtTime(s.f0Start * pitchMult, start);
      osc.frequency.exponentialRampToValueAtTime(s.f0Peak * pitchMult, start + s.dur * 0.42);
      osc.frequency.exponentialRampToValueAtTime(s.f0End * pitchMult, start + s.dur);

      subOsc.frequency.setValueAtTime(s.f0Start * 0.5 * pitchMult, start);
      subOsc.frequency.exponentialRampToValueAtTime(s.f0Peak * 0.5 * pitchMult, start + s.dur * 0.42);
      subOsc.frequency.exponentialRampToValueAtTime(s.f0End * 0.5 * pitchMult, start + s.dur);

      // Two parallel vocal tract formant resonators (F1 & F2)
      const f1Filter = this.ctx!.createBiquadFilter();
      f1Filter.type = 'bandpass';
      f1Filter.frequency.setValueAtTime(s.f1, start);
      f1Filter.Q.setValueAtTime(4.2, start);

      const f2Filter = this.ctx!.createBiquadFilter();
      f2Filter.type = 'bandpass';
      f2Filter.frequency.setValueAtTime(s.f2, start);
      f2Filter.Q.setValueAtTime(5.0, start);

      const syllGain = this.ctx!.createGain();
      syllGain.gain.setValueAtTime(0.005, start);
      syllGain.gain.linearRampToValueAtTime(0.42, start + 0.022);
      syllGain.gain.exponentialRampToValueAtTime(0.006, start + s.dur);

      osc.connect(f1Filter);
      osc.connect(f2Filter);
      subOsc.connect(f1Filter);
      f1Filter.connect(syllGain);
      f2Filter.connect(syllGain);
      syllGain.connect(spatialNode);

      osc.start(start);
      osc.stop(start + s.dur + 0.01);
      subOsc.start(start);
      subOsc.stop(start + s.dur + 0.01);
    });
  }

  playStumble() {
    this.vibrateStumble();
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
    this.vibrateChaiPickup();
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

  playCricketBatHit() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // 1. Crisp wooden Kashmir Willow bat "THWACK!" impact
    const woodOsc = this.ctx.createOscillator();
    const woodFilter = this.ctx.createBiquadFilter();
    const woodGain = this.ctx.createGain();

    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(520, t);
    woodOsc.frequency.exponentialRampToValueAtTime(135, t + 0.085);

    woodFilter.type = 'bandpass';
    woodFilter.frequency.setValueAtTime(920, t);
    woodFilter.Q.setValueAtTime(2.5, t);

    woodGain.gain.setValueAtTime(0.65, t);
    woodGain.gain.exponentialRampToValueAtTime(0.008, t + 0.09);

    woodOsc.connect(woodFilter);
    woodFilter.connect(woodGain);
    woodGain.connect(this.masterGain);
    woodOsc.start(t);
    woodOsc.stop(t + 0.095);

    // 2. Rising "Sixer!" ball flight whistle
    const whistleOsc = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistleOsc.type = 'sine';
    whistleOsc.frequency.setValueAtTime(380, t + 0.06);
    whistleOsc.frequency.exponentialRampToValueAtTime(980, t + 0.75);

    whistleGain.gain.setValueAtTime(0.01, t + 0.06);
    whistleGain.gain.linearRampToValueAtTime(0.18, t + 0.2);
    whistleGain.gain.exponentialRampToValueAtTime(0.005, t + 0.78);

    whistleOsc.connect(whistleGain);
    whistleGain.connect(this.masterGain);
    whistleOsc.start(t + 0.06);
    whistleOsc.stop(t + 0.8);
  }

  playWindowShatter() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // 1. High-frequency glass crash burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2400, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.42);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.45);

    // 2. Cascading crystal glass shard tinkles + teacup saucer clatter
    const shardFreqs = [2450, 3120, 1980, 3680, 2790, 4120, 1640, 3350];
    shardFreqs.forEach((freq, idx) => {
      const start = t + idx * 0.048;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.86, start + 0.12);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.005, start + 0.13);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.14);
    });
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
    this.lastHonkTime = now + 0.6;
    this.lastVendorTime = now + 1.6;

    // 1. Start Multi-Layered Continuous Bazaar Crowd & Street Murmur Bed
    const bufferLength = this.ctx.sampleRate * 4;
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
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
      b6 = white * 0.115926;
    }

    this.murmurSource = this.ctx.createBufferSource();
    this.murmurSource.buffer = noiseBuffer;
    this.murmurSource.loop = true;

    // Layer A: Warm Low-Mid Street & Traffic Ambience
    this.murmurFilter = this.ctx.createBiquadFilter();
    this.murmurFilter.type = 'bandpass';
    this.murmurFilter.frequency.setValueAtTime(480, now);
    this.murmurFilter.Q.setValueAtTime(0.8, now);

    this.murmurGain = this.ctx.createGain();
    this.murmurGain.gain.setValueAtTime(0.01, now);
    this.murmurGain.gain.linearRampToValueAtTime(0.17, now + 0.6);

    // Layer B: LFO-Modulated Vocal Crowd Chatter Formant (simulating bustling shopkeepers & bazaar chatter)
    this.chatterFilter = this.ctx.createBiquadFilter();
    this.chatterFilter.type = 'bandpass';
    this.chatterFilter.frequency.setValueAtTime(1050, now);
    this.chatterFilter.Q.setValueAtTime(2.2, now);

    this.chatterGain = this.ctx.createGain();
    this.chatterGain.gain.setValueAtTime(0.01, now);
    this.chatterGain.gain.linearRampToValueAtTime(0.09, now + 0.8);

    this.murmurLfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.murmurLfo.type = 'sine';
    this.murmurLfo.frequency.setValueAtTime(0.42, now); // Gentle ebb & flow as player passes bazaar stalls
    lfoGain.gain.setValueAtTime(280, now);
    this.murmurLfo.connect(lfoGain);
    lfoGain.connect(this.chatterFilter.frequency);
    this.murmurLfo.start(now);

    this.murmurSource.connect(this.murmurFilter);
    this.murmurFilter.connect(this.murmurGain);
    this.murmurGain.connect(this.ambientBus);

    this.murmurSource.connect(this.chatterFilter);
    this.chatterFilter.connect(this.chatterGain);
    this.chatterGain.connect(this.ambientBus);

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
    if (this.murmurLfo) {
      try {
        this.murmurLfo.stop();
        this.murmurLfo.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.murmurLfo = null;
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
    this.chatterFilter = null;
    this.chatterGain = null;
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

    const targetGain = isShop ? 0.1 : 0.16 + Math.min(0.11, (clampedRatio - 1) * 0.07);

    this.murmurFilter.frequency.setTargetAtTime(targetFreq, t, 0.15);
    this.murmurGain.gain.setTargetAtTime(targetGain, t, 0.15);

    if (this.chatterGain) {
      const chatterTarget = isShop ? 0.06 : 0.09 + Math.min(0.07, (clampedRatio - 1) * 0.05);
      this.chatterGain.gain.setTargetAtTime(chatterTarget, t, 0.15);
    }
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
    if (isPlaying || isShop) {
      const honkCooldown = isShop ? 3.2 : Math.max(1.3, 3.6 - intensity * 0.95);
      if (now - this.lastHonkTime > honkCooldown && Math.random() < (isShop ? 0.22 : 0.36 * intensity)) {
        this.lastHonkTime = now;
        this.playTrafficHonk(intensity);
      }

      const vendorCooldown = isShop ? 4.5 : Math.max(2.6, 5.8 - intensity * 1.05);
      if (now - this.lastVendorTime > vendorCooldown && Math.random() < (isShop ? 0.18 : 0.26 * intensity)) {
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
    const startPan = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.55);
    const distanceFactor = 0.25 + Math.random() * 0.45 * Math.min(1.3, intensity * 0.8);
    this.playAutoRickshawHonk(startPan, distanceFactor);
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

