// Web Audio API Retro Sound Effects Synthesizer

class AudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playHover() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Audio failed gracefully
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      // Ignore
    }
  }

  playStartGame() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        osc.frequency.exponentialRampToValueAtTime(freq * 2, now + idx * 0.1 + 0.4);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    } catch (e) {
      // Ignore
    }
  }

  playJump() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      // Ignore
    }
  }

  playAttack() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {
      // Ignore
    }
  }

  playSpecial() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const now = this.ctx.currentTime;
      // Synthesize deep heavy energy beam charge and blast
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.6);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.65);
    } catch (e) {
      // Ignore
    }
  }

  playExplosion() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Low pitch rumbling square wave
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(10, now + 0.3);

      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.35);
    } catch (e) {
      // Ignore
    }
  }

  playHeal() {
    try {
      this.init();
      if (!this.ctx || this.volume === 0) return;

      const now = this.ctx.currentTime;
      const notes = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5 (ascending arpeggio)

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch (e) {
      // Ignore
    }
  }
}

export const audio = new AudioEngine();
