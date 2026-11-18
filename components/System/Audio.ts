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

/**
 * Procedural Gully Sound Engine (Zero-Dependency Web Audio API)
 * Synthesizes all music, environmental ambience, and sound effects procedurally via
 * native Web Audio oscillators, noise buffers, and resonant biquad filters.
 */
export class SoundManager {
  private static instance: SoundManager | null = null;

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  ambientBus: GainNode | null = null;
  isMuted = false;
  private unmutedGain = 0.45;
  private hasAutoUnlocked = false;

  // Pre-allocated reusable noise buffers for GC-free high-speed performance
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  // Coin & Samosa Pitch-Climbing Streak State
  private coinStreak = 0;
  private lastCoinPickupTime = 0;

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
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('gully_audio_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
      } catch {
        // LocalStorage access may be restricted in sandboxes
      }
      this.setupAutoUnlock();
    }
  }

  /**
   * Automatically unlocks and resumes the AudioContext on the first user interaction
   * ("Bhaago!" start button, lane keys, or screen touch).
   */
  public setupAutoUnlock() {
    if (typeof window === 'undefined' || this.hasAutoUnlocked) return;
    const unlockEvents = ['click', 'keydown', 'touchstart', 'pointerdown'];
    const handleUnlock = () => {
      this.unlock();
      unlockEvents.forEach(evt => window.removeEventListener(evt, handleUnlock));
    };
    unlockEvents.forEach(evt => window.addEventListener(evt, handleUnlock, { passive: true }));
  }

  public unlock() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.hasAutoUnlocked = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.unmutedGain;
      this.masterGain.connect(this.ctx.destination);

      this.ambientBus = this.ctx.createGain();
      this.ambientBus.gain.value = 0.85;
      this.ambientBus.connect(this.masterGain);

      this.initNoiseBuffers();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Pre-allocates reusable white and pink noise AudioBuffers.
   * Eliminates per-SFX buffer allocations during gameplay to avoid garbage collection spikes.
   */
  private initNoiseBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const duration = 2.0;
    const length = Math.floor(sampleRate * duration);

    // 1. Reusable White Noise Buffer
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // 2. Reusable Pink Noise Buffer (Paul Kellet's filter method)
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const pinkData = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  /**
   * Safely disconnects source and connected nodes on playback termination
   * to guarantee zero uncollected AudioNodes or memory leaks.
   */
  private registerCleanup(
    source: AudioScheduledSourceNode,
    ...connectedNodes: (AudioNode | null | undefined)[]
  ) {
    source.onended = () => {
      try {
        source.disconnect();
      } catch {}
      connectedNodes.forEach(node => {
        if (node) {
          try {
            node.disconnect();
          } catch {}
        }
      });
    };
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gully_audio_muted', this.isMuted ? 'true' : 'false');
      } catch {}
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.unmutedGain,
        this.ctx.currentTime,
        0.04
      );
    }
    return this.isMuted;
  }

  setMasterVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.unmutedGain = clamped * 0.65;
    this.isMuted = clamped === 0;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gully_audio_muted', this.isMuted ? 'true' : 'false');
      } catch {}
    }
    if (!this.ctx || !this.masterGain) this.init();
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.unmutedGain,
        this.ctx.currentTime,
        0.04
      );
    }
  }

  /**
   * Pauses or silences looping/ambient sounds immediately when Raju Chai Tapri,
   * Pause menu, or Victory/Game Over modals open.
   */
  pauseOrSilenceModals() {
    if (!this.ctx || !this.ambientBus) return;
    this.ambientBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }

  /**
   * Smoothly restores ambient sound when returning to gameplay.
   */
  resumeAmbience() {
    if (!this.ctx || !this.ambientBus) return;
    this.ambientBus.gain.setTargetAtTime(0.85, this.ctx.currentTime, 0.05);
  }

  /**
   * Triggers mobile haptic feedback via the Web Vibration API when supported.
   * Runs independently of audio mute state so tactile feedback always works on mobile.
   */
  vibrate(pattern: number | number[]) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on desktop or unsupported devices
    }
  }

  vibrateObstacleHit() {
    this.vibrate([120, 45, 160]);
  }

  vibrateStumble() {
    this.vibrate([55, 35, 55]);
  }

  vibrateChaiPickup() {
    this.vibrate([35, 30, 60, 25, 95]);
  }

  vibrateChaiSmash() {
    this.vibrate(45);
  }

  // =========================================================================
  // 1. COIN & SAMOSA PICKUP (PITCH-CLIMBING STREAK)
  // =========================================================================

  /**
   * Crisp bright chime (triangle + sine oscillator around 587Hz -> 880Hz).
   * Consecutive pickups within 1.2s increment a streak counter that shifts the pitch
   * up by 1 semitone per coin (capped at +12 semitones).
   */
  playCoinPickup() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    if (now - this.lastCoinPickupTime <= 1.2) {
      this.coinStreak = Math.min(12, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinPickupTime = now;

    // Pitch multiplier: 1 semitone per coin, capped at +12 semitones (1 octave)
    const semitoneMultiplier = Math.pow(2, this.coinStreak / 12);
    const startFreq = 587.33 * semitoneMultiplier; // Base D5
    const endFreq = 880.0 * semitoneMultiplier;   // Base A5

    const oscTri = this.ctx.createOscillator();
    const oscSine = this.ctx.createOscillator();
    const gainTri = this.ctx.createGain();
    const gainSine = this.ctx.createGain();

    oscTri.type = 'triangle';
    oscSine.type = 'sine';

    oscTri.frequency.setValueAtTime(startFreq, now);
    oscTri.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    oscSine.frequency.setValueAtTime(startFreq * 1.5, now);
    oscSine.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + 0.12);

    gainTri.gain.setValueAtTime(0.24, now);
    gainTri.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

    gainSine.gain.setValueAtTime(0.12, now);
    gainSine.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

    oscTri.connect(gainTri);
    gainTri.connect(this.masterGain);
    oscSine.connect(gainSine);
    gainSine.connect(this.masterGain);

    oscTri.start(now);
    oscTri.stop(now + 0.15);
    oscSine.start(now);
    oscSine.stop(now + 0.15);

    this.registerCleanup(oscTri, gainTri);
    this.registerCleanup(oscSine, gainSine);
    this.vibrate(18);
  }

  /** Alias for existing coin/gem pickup calls */
  playGemCollect() {
    this.playCoinPickup();
  }

  /**
   * Richer 2-note chord chime for Hot Samosas (D5 587Hz + A5 880Hz + harmonic third 740Hz).
   */
  playSamosaCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const chordNotes = [587.33, 739.99, 880.0];

    chordNotes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx === 1 ? 'sine' : 'triangle';
      const start = now + idx * 0.025;

      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.14, start + 0.22);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.005, start + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.25);
      this.registerCleanup(osc, gain);
    });

    this.vibrate([28, 20, 38]);
  }

  /**
   * Rich 2-note celebratory chord chime + sparkle for B-H-A-A-G-O letters.
   */
  playLetterCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Harmonic C-Major / D-Major celebratory chord
    const freqs = [587.33, 739.99, 880.0, 1174.66];

    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const start = now + i * 0.035;

      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 1.08, start + 0.25);

      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.005, start + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.29);
      this.registerCleanup(osc, gain);
    });

    this.vibrate([30, 20, 50]);
  }

  // =========================================================================
  // 2. CHAPPAL TELEGRAPH & FLYING WHOOSH
  // =========================================================================

  /**
   * Sharp two-tone alert whistle (sine wave rapid pitch glide from 1400Hz to 2200Hz)
   * triggered when the red chappal warning zone spawns on the floor.
   */
  playChappalTelegraph() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Two-tone alert whistle
    [0, 0.085].forEach((offset, idx) => {
      const start = now + offset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';

      const f1 = idx === 0 ? 1400 : 1620;
      const f2 = idx === 0 ? 2200 : 2550;

      osc.frequency.setValueAtTime(f1, start);
      osc.frequency.exponentialRampToValueAtTime(f2, start + 0.075);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.005, start + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.085);
      this.registerCleanup(osc, gain);
    });

    this.vibrate([35, 20, 45]);
  }

  /** Alias for existing calls to windup */
  playChappalWindup() {
    this.playChappalTelegraph();
  }

  /**
   * Filtered white-noise bandpass sweep (center frequency sweeping from 300Hz to 1200Hz
   * and down to 400Hz over 0.35s) simulating a spinning chappal whoosh flyby.
   */
  playChappalWhoosh(pan = 0, proximity = 1.0) {
    this.vibrate(25);
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    const now = this.ctx.currentTime;
    const dur = 0.35;
    const clampedPan = Math.max(-1, Math.min(1, pan));
    const clampedProx = Math.max(0.4, Math.min(1.4, proximity));

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.16);
    filter.frequency.exponentialRampToValueAtTime(400, now + dur);
    filter.Q.setValueAtTime(3.8, now);

    const gain = this.ctx.createGain();
    const peakVol = Math.min(0.48, 0.32 * clampedProx);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    let targetNode: AudioNode = this.masterGain;
    let panner: StereoPannerNode | null = null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(clampedPan, now);
      panner.pan.linearRampToValueAtTime(-clampedPan * 0.3, now + dur);
      panner.connect(this.masterGain);
      targetNode = panner;
    }

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    noiseSource.start(now);
    noiseSource.stop(now + dur + 0.01);
    this.registerCleanup(noiseSource, filter, gain, panner);
  }

  playChappalThrow(pan = 0) {
    this.playChappalWhoosh(pan, 1.25);
  }

  // =========================================================================
  // 3. SHARMA UNCLE TAUNT CUE
  // =========================================================================

  /**
   * Punchy comic "wah-wah" / angry dual-tone horn grunt triggered whenever
   * the top-center Sharma Uncle Hinglish taunt banner appears.
   */
  playUncleTaunt(isUrgent = false) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.38;

    // Dual detuned sawtooth oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    const baseF = isUrgent ? 185 : 160;
    osc1.frequency.setValueAtTime(baseF, now);
    osc1.frequency.exponentialRampToValueAtTime(baseF * 1.35, now + 0.12);
    osc1.frequency.exponentialRampToValueAtTime(baseF * 0.85, now + dur);

    osc2.frequency.setValueAtTime(baseF * 1.04, now);
    osc2.frequency.exponentialRampToValueAtTime(baseF * 1.35 * 1.04, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(baseF * 0.85 * 1.04, now + dur);

    // Resonant "wah-wah" formant filter modulation
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(5.5, now);
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.11);
    filter.frequency.exponentialRampToValueAtTime(360, now + 0.26);
    filter.frequency.exponentialRampToValueAtTime(620, now + 0.32);
    filter.frequency.exponentialRampToValueAtTime(220, now + dur);

    const peakVol = isUrgent ? 0.36 : 0.28;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + dur + 0.01);
    osc2.start(now);
    osc2.stop(now + dur + 0.01);

    this.registerCleanup(osc1, filter, gain);
    this.registerCleanup(osc2);
  }

  /** Alias for existing calls */
  playUncleShout(isUrgent = false) {
    this.playUncleTaunt(isUrgent);
  }

  playUncleFakeOut() {
    this.playUncleTaunt(false);
  }

  // =========================================================================
  // 4. NEAR-MISS AUTO-RICKSHAW / BUS HORN
  // =========================================================================

  /**
   * Nasal Indian auto-rickshaw squeeze horn:
   * Two detuned sawtooth oscillators at 480Hz and 610Hz routed through a 1000Hz bandpass
   * filter with a quick double-beep envelope (80ms on, 40ms gap, 140ms on).
   */
  playAutoRickshawHorn(pan = 0) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const clampedPan = Math.max(-1, Math.min(1, pan));

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(480, now);
    osc2.frequency.setValueAtTime(610, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(3.2, now);

    // Double-beep envelope: 80ms on, 40ms gap, 140ms on
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    gain.gain.setValueAtTime(0.35, now + 0.075);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08); // 80ms end
    // 40ms gap (0.08 to 0.12)
    gain.gain.setValueAtTime(0.001, now + 0.12);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.135);
    gain.gain.setValueAtTime(0.38, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.27); // 140ms end (total ~270ms)

    let targetNode: AudioNode = this.masterGain;
    let panner: StereoPannerNode | null = null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(clampedPan, now);
      panner.connect(this.masterGain);
      targetNode = panner;
    }

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    osc1.start(now);
    osc1.stop(now + 0.28);
    osc2.start(now);
    osc2.stop(now + 0.28);

    this.registerCleanup(osc1, filter, gain, panner);
    this.registerCleanup(osc2);
  }

  /** Alias for existing auto rickshaw honk */
  playAutoRickshawHonk(pan = 0, _distanceFactor = 0.6) {
    this.playAutoRickshawHorn(pan);
  }

  // =========================================================================
  // 5. JUMP, DOUBLE-JUMP, FAST-FALL, SLIDE & LANDING THUMP
  // =========================================================================

  /**
   * Short sine sweep:
   * Normal Jump: 150Hz -> 380Hz over 120ms.
   * Double-Jump (Gully Parkour): 280Hz -> 620Hz over 140ms.
   */
  playJump(isDouble = false) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const dur = isDouble ? 0.14 : 0.12;
    const startFreq = isDouble ? 280 : 150;
    const endFreq = isDouble ? 620 : 380;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + dur + 0.01);
    this.registerCleanup(osc, gain);
  }

  /**
   * Low pink-noise friction swoosh (lowpass filter at 650Hz).
   */
  playSlide() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain || !this.pinkNoiseBuffer) return;

    const now = this.ctx.currentTime;
    const dur = 0.24;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.pinkNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + dur + 0.01);
    this.registerCleanup(noiseSource, filter, gain);
  }

  /**
   * Mid-air Fast-Fall friction swoosh with downward plunge glide.
   */
  playFastFall() {
    this.playSlide();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.17);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.18);
    this.registerCleanup(osc, gain);
  }

  /**
   * Soft bass thump (110Hz -> 45Hz over 150ms) on landing.
   */
  playLandingThump() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
    this.registerCleanup(osc, gain);
  }

  // =========================================================================
  // 6. RAJU CHAI TAPRI PURCHASE & SHIELD BREAK
  // =========================================================================

  /**
   * Metallic coin register clink (high-frequency FM bell at 1200Hz and 1800Hz)
   * played when buying an upgrade with chaiWallet rupees.
   */
  playShopBuy() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.28;

    // Carrier oscillator: 1200Hz
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(1200, now);

    // Modulator oscillator: 1800Hz for metallic FM clang
    const modulator = this.ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(1800, now);

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(750, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + dur);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0.35, now);
    mainGain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    carrier.connect(mainGain);
    mainGain.connect(this.masterGain);

    carrier.start(now);
    carrier.stop(now + dur + 0.01);
    modulator.start(now);
    modulator.stop(now + dur + 0.01);

    // Secondary high ping register clink at t + 0.05s
    const pingOsc = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    pingOsc.type = 'triangle';
    pingOsc.frequency.setValueAtTime(2400, now + 0.05);

    pingGain.gain.setValueAtTime(0.2, now + 0.05);
    pingGain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);

    pingOsc.connect(pingGain);
    pingGain.connect(this.masterGain);

    pingOsc.start(now + 0.05);
    pingOsc.stop(now + 0.26);

    this.registerCleanup(carrier, mainGain);
    this.registerCleanup(modulator, modGain);
    this.registerCleanup(pingOsc, pingGain);
    this.vibrate([30, 25, 45]);
  }

  /**
   * Low crunchy impact burst (white noise + 90Hz square wave decay)
   * when absorbing a hit with the shield or smashing an obstacle.
   */
  playShieldBlock() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    const now = this.ctx.currentTime;
    const dur = 0.24;

    // 1. Noise crunch
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.whiteNoiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(520, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(140, now + dur);
    noiseFilter.Q.setValueAtTime(2.2, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.38, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + dur + 0.01);

    // 2. 90Hz square wave decay impact
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + dur);

    oscGain.gain.setValueAtTime(0.32, now);
    oscGain.gain.exponentialRampToValueAtTime(0.005, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + dur + 0.01);

    this.registerCleanup(noiseSource, noiseFilter, noiseGain);
    this.registerCleanup(osc, oscGain);
    this.vibrate([65, 30, 85]);
  }

  playObstacleSmash() {
    this.playShieldBlock();
  }

  // =========================================================================
  // 7. COMPLEMENTARY GAMEPLAY PROCEDURAL AUDIO
  // =========================================================================

  playNearMiss(streak = 1) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    const t = this.ctx.currentTime;
    const pitchBoost = Math.min(1.65, 1 + Math.max(0, streak - 1) * 0.1);

    // Doppler air-slice whoosh using pre-allocated noise buffer
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950 * pitchBoost, t);
    filter.frequency.exponentialRampToValueAtTime(2400 * pitchBoost, t + 0.08);
    filter.frequency.exponentialRampToValueAtTime(620, t + 0.17);
    filter.Q.setValueAtTime(3.2, t);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.01, t);
    nGain.gain.linearRampToValueAtTime(0.32, t + 0.04);
    nGain.gain.exponentialRampToValueAtTime(0.008, t + 0.18);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.18);
    this.registerCleanup(noise, filter, nGain);

    // Dual-Note Adrenaline Spark Chime
    [660 * pitchBoost, 990 * pitchBoost].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const start = t + idx * 0.035;

      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, start + 0.14);

      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.008, start + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.16);
      this.registerCleanup(osc, gain);
    });

    this.vibrate(28);
  }

  playPowerUpCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      const start = t + i * 0.045;

      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.26, start);
      gain.gain.exponentialRampToValueAtTime(0.008, start + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.24);
      this.registerCleanup(osc, gain);
    });
    this.vibrate([30, 25, 55]);
  }

  playEmergencyDodge() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(1480, t + 0.16);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.008, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
    this.registerCleanup(osc, gain);
    this.vibrate([40, 20, 40]);
  }

  playDamage() {
    this.vibrateObstacleHit();
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);

    oscGain.gain.setValueAtTime(0.38, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
    noise.start(t);
    noise.stop(t + 0.3);

    this.registerCleanup(osc, oscGain);
    this.registerCleanup(noise, noiseGain);
  }

  playCowBell() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    [540, 810].forEach(f => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.22);
      this.registerCleanup(osc, gain);
    });
  }

  playStumble() {
    this.vibrateStumble();
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.16);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
    this.registerCleanup(osc, gain);
  }

  playChaiBoost() {
    this.vibrateChaiPickup();
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      const start = t + i * 0.04;

      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.008, start + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.28);
      this.registerCleanup(osc, gain);
    });
  }

  playComboTick(comboCount = 1) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = Math.min(1800, 750 + comboCount * 65);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
    this.registerCleanup(osc, gain);
  }

  playCricketBatHit() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
    this.registerCleanup(osc, gain);
    this.vibrate(40);
  }

  playWindowShatter() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    const t = this.ctx.currentTime;
    const dur = 0.45;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + dur);
    this.registerCleanup(noise, filter, gain);
  }

  playSpatialBazaarYell(
    _phraseIndex?: number,
    _worldX?: number,
    _worldY?: number,
    _worldZ?: number,
    _playerX?: number,
    _activeSpeed?: number
  ) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;
    this.playUncleTaunt(false);
  }

  // =========================================================================
  // 8. DYNAMIC BAZAAR AMBIENCE & RHYTHMIC TABLA ENGINE
  // =========================================================================

  updateBazaarIntensity(nextState: BazaarIntensityState) {
    this.intensityState = { ...nextState };
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
    const t = this.ctx.currentTime;

    if (!this.whiteNoiseBuffer) this.initNoiseBuffers();
    if (!this.whiteNoiseBuffer) return;

    this.murmurSource = this.ctx.createBufferSource();
    this.murmurSource.buffer = this.whiteNoiseBuffer;
    this.murmurSource.loop = true;

    this.murmurFilter = this.ctx.createBiquadFilter();
    this.murmurFilter.type = 'bandpass';
    this.murmurFilter.frequency.setValueAtTime(420, t);
    this.murmurFilter.Q.setValueAtTime(1.8, t);

    this.murmurGain = this.ctx.createGain();
    this.murmurGain.gain.setValueAtTime(0.035, t);

    this.chatterFilter = this.ctx.createBiquadFilter();
    this.chatterFilter.type = 'bandpass';
    this.chatterFilter.frequency.setValueAtTime(920, t);
    this.chatterFilter.Q.setValueAtTime(3.2, t);

    this.chatterGain = this.ctx.createGain();
    this.chatterGain.gain.setValueAtTime(0.015, t);

    this.murmurLfo = this.ctx.createOscillator();
    this.murmurLfo.type = 'sine';
    this.murmurLfo.frequency.setValueAtTime(0.35, t);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, t);

    this.murmurLfo.connect(lfoGain);
    lfoGain.connect(this.murmurFilter.frequency);

    this.murmurSource.connect(this.murmurFilter);
    this.murmurFilter.connect(this.murmurGain);
    this.murmurGain.connect(this.ambientBus);

    this.murmurSource.connect(this.chatterFilter);
    this.chatterFilter.connect(this.chatterGain);
    this.chatterGain.connect(this.ambientBus);

    this.murmurSource.start(t);
    this.murmurLfo.start(t);

    this.stepIndex = 0;
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
      } catch {}
      this.murmurLfo = null;
    }
    if (this.murmurSource) {
      try {
        this.murmurSource.stop();
        this.murmurSource.disconnect();
      } catch {}
      this.murmurSource = null;
    }
    if (this.murmurFilter) {
      this.murmurFilter.disconnect();
      this.murmurFilter = null;
    }
    if (this.murmurGain) {
      this.murmurGain.disconnect();
      this.murmurGain = null;
    }
    if (this.chatterFilter) {
      this.chatterFilter.disconnect();
      this.chatterFilter = null;
    }
    if (this.chatterGain) {
      this.chatterGain.disconnect();
      this.chatterGain = null;
    }
  }

  private syncContinuousMurmur() {
    if (!this.ctx || !this.murmurFilter || !this.murmurGain) return;
    const t = this.ctx.currentTime;
    const { speedRatio, isShop, isChaiBoostActive } = this.intensityState;

    const baseMurmurFreq = isShop ? 320 : Math.min(780, 380 + (speedRatio - 1) * 160);
    this.murmurFilter.frequency.setTargetAtTime(baseMurmurFreq, t, 0.25);

    const targetMurmurVol = isShop
      ? 0.02
      : isChaiBoostActive
      ? 0.055
      : Math.min(0.065, 0.03 + (speedRatio - 1) * 0.015);
    this.murmurGain.gain.setTargetAtTime(targetMurmurVol, t, 0.2);

    if (this.chatterGain) {
      const targetChatterVol = isShop ? 0.01 : Math.min(0.032, 0.014 + (speedRatio - 1) * 0.01);
      this.chatterGain.gain.setTargetAtTime(targetChatterVol, t, 0.2);
    }
  }

  private scheduleNextTick() {
    if (!this.isAmbienceRunning || !this.ctx || !this.ambientBus) return;

    const { speedRatio, isShop, isPlaying } = this.intensityState;
    const effectiveSpeed = isShop ? 1.0 : Math.max(0.75, Math.min(2.8, speedRatio));
    const base16thSec = 0.13 / effectiveSpeed;

    this.playPercussionStep(this.stepIndex, effectiveSpeed);

    const now = Date.now();
    const honkCooldown = isShop ? 4200 : Math.max(1400, 3600 / effectiveSpeed);
    const vendorCooldown = isShop ? 5500 : Math.max(2200, 4800 / effectiveSpeed);

    if (isPlaying || isShop) {
      if (now - this.lastHonkTime > honkCooldown && Math.random() < (isShop ? 0.2 : 0.35)) {
        this.lastHonkTime = now;
        this.playTrafficHonk(effectiveSpeed);
      }

      if (now - this.lastVendorTime > vendorCooldown && Math.random() < (isShop ? 0.16 : 0.25)) {
        this.lastVendorTime = now;
        this.playVendorCall(effectiveSpeed);
      }
    }

    this.stepIndex = (this.stepIndex + 1) % 16;
    const jitterMs = (Math.random() - 0.5) * 8;
    const delayMs = Math.max(35, base16thSec * 1000 + jitterMs);

    this.schedulerTimer = window.setTimeout(() => {
      this.scheduleNextTick();
    }, delayMs);
  }

  private playPercussionStep(step: number, intensity: number) {
    if (!this.ctx || !this.ambientBus) return;
    const t = this.ctx.currentTime;
    const { isShop, isChaiBoostActive } = this.intensityState;

    const isBayanHit =
      step === 0 ||
      step === 6 ||
      step === 10 ||
      (step === 14 && intensity >= 1.25) ||
      (step === 3 && isChaiBoostActive);

    if (isBayanHit) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const bayanPitch = isShop ? 55 : 68;
      const modPitch = bayanPitch + (step === 6 || step === 14 ? 18 : 0);

      osc.frequency.setValueAtTime(modPitch, t);
      osc.frequency.exponentialRampToValueAtTime(bayanPitch * 0.72, t + 0.16);

      const bayanVol = isShop ? 0.05 : Math.min(0.18, 0.11 + intensity * 0.035);
      gain.gain.setValueAtTime(bayanVol, t);
      gain.gain.exponentialRampToValueAtTime(0.002, t + 0.17);

      osc.connect(gain);
      gain.connect(this.ambientBus);

      osc.start(t);
      osc.stop(t + 0.18);
      this.registerCleanup(osc, gain);
    }

    const isDayanHit = !isShop && (step === 2 || step === 4 || step === 8 || step === 12);
    if (isDayanHit) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const baseDayan = 295;
      osc.frequency.setValueAtTime(baseDayan, t);
      osc.frequency.exponentialRampToValueAtTime(baseDayan * 0.9, t + 0.07);

      const dayanVol = Math.min(0.08, 0.045 + intensity * 0.015);
      gain.gain.setValueAtTime(dayanVol, t);
      gain.gain.exponentialRampToValueAtTime(0.002, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ambientBus);

      osc.start(t);
      osc.stop(t + 0.09);
      this.registerCleanup(osc, gain);
    }
  }

  private playTrafficHonk(intensity: number) {
    const startPan = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.55);
    this.playAutoRickshawHorn(startPan);
  }

  private playVendorCall(intensity: number) {
    if (!this.ctx || !this.ambientBus) return;
    this.playUncleTaunt(false);
  }
}

export const soundManager = SoundManager.getInstance();
export const audio = soundManager;
export { SoundManager as AudioController };
