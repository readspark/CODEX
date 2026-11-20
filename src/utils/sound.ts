let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainVal = 0.04, delay = 0) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(gainVal, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationMs / 1000);
  } catch {
    // Ignore audio context restrictions cleanly
  }
}

export function playClick(enabled: boolean) {
  if (!enabled) return;
  tone(520, 45, 'triangle', 0.025);
}

export function playStep(enabled: boolean) {
  if (!enabled) return;
  tone(420, 50, 'sine', 0.025);
}

export function playError(enabled: boolean) {
  if (!enabled) return;
  tone(220, 120, 'sawtooth', 0.03);
  tone(175, 160, 'sawtooth', 0.025, 0.09);
}

export function playSuccess(enabled: boolean) {
  if (!enabled) return;
  tone(523.25, 110, 'triangle', 0.04, 0);
  tone(659.25, 110, 'triangle', 0.04, 0.08);
  tone(783.99, 180, 'triangle', 0.045, 0.16);
}

export function playUnlock(enabled: boolean) {
  if (!enabled) return;
  tone(587.33, 90, 'sine', 0.04, 0);
  tone(880, 180, 'sine', 0.045, 0.09);
}
