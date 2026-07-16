export class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmInterval: number | null = null;
  private isMuted: boolean = false;
  private isBGMPlaying: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSlash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.setValueAtTime(60, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playPowerUp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [200, 300, 400, 600];
    const time = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + i * 0.06);

      gain.gain.setValueAtTime(0.1, time + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.06 + 0.1);

      osc.start(time + i * 0.06);
      osc.stop(time + i * 0.06 + 0.1);
    });
  }

  playExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const duration = 0.5;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Populate buffer with noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Create lowpass filter for rumbling explosion sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  startBGM() {
    if (this.isBGMPlaying) return;
    this.initContext();
    this.isBGMPlaying = true;

    // Fast corporate electronic bassline loop
    const baseTempo = 130; // BPM
    const eighthNoteTime = 60 / baseTempo / 2; // Time of an 8th note in seconds

    // Simple heavy arcade action bass progression
    const melody = [
      110, 110, 130, 110, 146, 146, 130, 164, // Row A
      110, 110, 130, 110, 98,  98,  82,  73   // Row B
    ];
    let step = 0;

    const playBgmStep = () => {
      if (this.isMuted || !this.isBGMPlaying || !this.ctx) return;

      const time = this.ctx.currentTime;
      const freq = melody[step % melody.length];

      // Slap Bass Synth
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      // Low pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, time);
      osc.disconnect(gain);
      osc.connect(filter);
      filter.connect(gain);

      // Accent every downbeat
      const isDownbeat = (step % 4 === 0);
      const volume = isDownbeat ? 0.08 : 0.04;

      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + eighthNoteTime * 0.9);

      osc.start(time);
      osc.stop(time + eighthNoteTime * 0.95);

      // Simple click/hi-hat on offbeats
      if (step % 2 === 1) {
        const hat = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hat.type = 'sine';
        hat.frequency.setValueAtTime(8000, time);
        hatGain.gain.setValueAtTime(0.003, time);
        hatGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
        hat.connect(hatGain);
        hatGain.connect(this.ctx.destination);
        hat.start(time);
        hat.stop(time + 0.04);
      }

      step++;
    };

    // Run interval
    const intervalMs = eighthNoteTime * 1000;
    this.bgmInterval = window.setInterval(playBgmStep, intervalMs);
  }

  stopBGM() {
    this.isBGMPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }
}

export const sound = new SoundManager();
