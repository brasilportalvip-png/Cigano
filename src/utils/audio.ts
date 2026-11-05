// Pure Web Audio API Synthesizer for Tarot Sanctuary
let audioCtx: AudioContext | null = null;
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
let isSoundEnabled = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleAmbientSound(enable?: boolean): boolean {
  try {
    const ctx = getAudioContext();
    const shouldEnable = enable !== undefined ? enable : !isSoundEnabled;

    if (shouldEnable) {
      if (!ambientOsc1) {
        // Celestial Tibetan Singing Bowl / Ethereal Drone (432Hz fundamental harmonic)
        ambientOsc1 = ctx.createOscillator();
        ambientOsc2 = ctx.createOscillator();
        ambientGain = ctx.createGain();

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        ambientOsc1.type = 'sine';
        ambientOsc1.frequency.setValueAtTime(216, ctx.currentTime); // A3 harmonic

        ambientOsc2.type = 'sine';
        ambientOsc2.frequency.setValueAtTime(217.5, ctx.currentTime); // Subtle binaural beat

        ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
        ambientGain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 3);

        ambientOsc1.connect(filter);
        ambientOsc2.connect(filter);
        filter.connect(ambientGain);
        ambientGain.connect(ctx.destination);

        ambientOsc1.start();
        ambientOsc2.start();
      } else if (ambientGain) {
        ambientGain.gain.cancelScheduledValues(ctx.currentTime);
        ambientGain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 1);
      }
      isSoundEnabled = true;
    } else {
      if (ambientGain) {
        ambientGain.gain.cancelScheduledValues(ctx.currentTime);
        ambientGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
      }
      isSoundEnabled = false;
    }
    return isSoundEnabled;
  } catch (e) {
    console.warn('Audio not available:', e);
    return false;
  }
}

export function playCardRevealSound() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic bell chime (C major celestial chord: C5 - 523Hz, E5 - 659Hz, G5 - 784Hz)
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.05, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + 1.8);
    });
  } catch {
    // Ignore audio errors gracefully
  }
}

export function playShuffleSound() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Noise burst filtered to simulate card swish
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  } catch {
    // Ignore
  }
}

export function playOracleChime() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ethereal triple bell of enlightenment
    const chords = [440, 554.37, 659.25, 880];
    chords.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.6);
    });
  } catch {
    // Ignore
  }
}

export function getAudioState(): boolean {
  return isSoundEnabled;
}
