export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;

    this.audioBuffers = {};
    this.bgmNode = null;
    this.bgmPlaying = false;
    this.playbackRate = 1.0;

    this.coinStreak = 0;
    this.lastCoinTime = 0;
    this.pitchLadder = [1.0, 1.06, 1.12, 1.18, 1.25, 1.33, 1.41, 1.5];

    this.initAudioContext();
    this.preloadAudioSamples();
  }

  initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();
    }
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    }
    return this.muted;
  }

  async preloadAudioSamples() {
    if (!this.ctx) return;

    const files = {
      coin: '/audio/coin.wav',
      crash: '/audio/crash.wav',
      bull_moo: '/audio/bull_moo.ogg',
      bear_roar: '/audio/bear_roar.ogg',
      bgm: '/audio/bgm.mp3'
    };

    for (const [key, url] of Object.entries(files)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arrayBuffer);
        this.audioBuffers[key] = decoded;
      } catch (err) {
        console.warn(`Audio sample load fallback for ${key}:`, err);
      }
    }
  }

  startBGM() {
    if (this.muted || this.bgmPlaying) return;
    this.ensureContext();
    if (!this.ctx || !this.audioBuffers.bgm) return;

    this.stopBGM();

    this.bgmNode = this.ctx.createBufferSource();
    this.bgmNode.buffer = this.audioBuffers.bgm;
    this.bgmNode.loop = true;
    this.bgmNode.playbackRate.value = this.playbackRate;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.85;

    this.bgmNode.connect(this.bgmGain);
    this.bgmGain.connect(this.ctx.destination);

    this.bgmNode.start(0);
    this.bgmPlaying = true;
  }

  // 🎵 GRADUAL BGM ACCELERATION (Unaffected by rocket booster pickup!)
  updateBGMTempo(runSpeed, isJetpack = false, isBull = false) {
    // Music tempo strictly increases gradually as the game gets faster
    const rate = 1.0 + Math.min(0.35, (runSpeed - 32) * 0.008);
    this.playbackRate = rate;

    if (this.bgmNode && this.bgmNode.playbackRate) {
      this.bgmNode.playbackRate.setTargetAtTime(this.playbackRate, this.ctx.currentTime, 0.1);
    }
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmNode) {
      try { this.bgmNode.stop(); } catch (e) {}
      this.bgmNode = null;
    }
  }

  playSample(key, pitch = 1.0, volume = 0.08) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();

    const buffer = this.audioBuffers[key];
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(0);
  }

  playCoin() {
    const now = Date.now();
    if (now - this.lastCoinTime > 1200) {
      this.coinStreak = 0;
    } else {
      this.coinStreak = Math.min(this.pitchLadder.length - 1, this.coinStreak + 1);
    }
    this.lastCoinTime = now;

    const pitch = this.pitchLadder[this.coinStreak];
    this.playSample('coin', pitch, 0.07);
  }

  playJump() {
    return;
  }

  playSlide() {
    return;
  }

  playLaneSwitch() {
    return;
  }

  playBullActivate() {
    this.playSample('bull_moo', 0.95, 0.12);
  }

  playBoardActivate() {
    this.playSample('coin', 1.5, 0.08);
  }

  playPowerup() {
    this.playSample('coin', 1.3, 0.08);
  }

  playSmash() {
    this.playSample('crash', 1.2, 0.12);
  }

  playBearRoar() {
    this.playSample('bear_roar', 1.0, 0.15);
  }

  playCrash() {
    this.playSample('crash', 0.9, 0.2);
  }
}
